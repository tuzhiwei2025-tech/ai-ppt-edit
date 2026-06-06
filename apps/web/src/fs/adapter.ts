/**
 * File System Access API adapter.
 * All disk I/O lives here; the rest of the app only sees DeckStore.
 */
import { ulid } from '../lib/ulid.js';
import type { DeckMeta } from '@ai-ppt-edit/protocol';
import { SLIDE_SELECTOR } from '@ai-ppt-edit/protocol';
import type { SlideState } from '../store/deckStore.js';
import { applyWatermarkToDeckHtml, type WatermarkConfig } from '../lib/watermark.js';

const IDB_DB = 'hds-v1';
const IDB_STORE = 'handles';
export const IDB_SNAPSHOTS = 'snapshots';
export const IDB_SESSION = 'session';
const BACKUP_DIR = '.hds-backup';
const MAX_BACKUPS = 50;

interface HtmlDeckFile {
  fileName: string;
  html: string;
}

const IMPORT_SLIDE_SELECTORS = [
  'section.slide',
  'div.slide-container',
  'div.slide',
];

const INTERNAL_SLIDE_SELECTORS = [SLIDE_SELECTOR];

const ATOMIC_NAME_RE = /(?:^|[-_\s])(chart|charts|echarts|graph|plot|mermaid)(?:$|[-_\s])/i;

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function uniqueRoots(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter((el) => !elements.some((other) => other !== el && other.contains(el)));
}

function findSlideRoots(doc: Document, source: 'import' | 'internal' = 'internal'): HTMLElement[] {
  const selectors = source === 'import' ? IMPORT_SLIDE_SELECTORS : INTERNAL_SLIDE_SELECTORS;
  for (const selector of selectors) {
    const roots = uniqueRoots(Array.from(doc.querySelectorAll<HTMLElement>(selector)));
    if (roots.length) return roots;
  }
  return [];
}

function markAtomicComponents(root: HTMLElement): void {
  const mark = (el: HTMLElement) => {
    el.setAttribute('data-hds-atomic', 'chart');
  };

  root.querySelectorAll<HTMLElement>('canvas').forEach((canvas) => {
    const host = canvas.closest<HTMLElement>('.chart-container,[data-chart],[data-echarts]');
    mark(host ?? canvas);
  });

  root.querySelectorAll<HTMLElement>('.mermaid,[data-mermaid]').forEach(mark);

  root.querySelectorAll<HTMLElement>('[id],[class]').forEach((el) => {
    const id = el.getAttribute('id') ?? '';
    const className = el.getAttribute('class') ?? '';
    if (ATOMIC_NAME_RE.test(id) || ATOMIC_NAME_RE.test(className)) mark(el);
  });
}

function bodyRuntimeNodes(doc: Document, roots: HTMLElement[]): Element[] {
  if (roots.length !== 1) return [];
  return Array.from(doc.body.children).filter((el) => {
    if (roots.some((root) => root === el || root.contains(el) || el.contains(root))) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'script' || tag === 'style' || tag === 'template';
  });
}

function normalizeSlideRoot(
  doc: Document,
  root: HTMLElement,
  ordinal: number,
  extraNodes: Element[] = [],
): HTMLElement {
  const slide = doc.createElement('div');
  for (const attr of Array.from(root.attributes)) {
    slide.setAttribute(attr.name, attr.value);
  }

  const classes = new Set((root.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
  classes.add('slide');
  slide.setAttribute('class', Array.from(classes).join(' '));
  slide.setAttribute('data-page', String(ordinal));
  if (!slide.getAttribute('data-page-id')) slide.setAttribute('data-page-id', ulid());

  slide.innerHTML = root.innerHTML;
  for (const node of extraNodes) slide.appendChild(node.cloneNode(true));
  markAtomicComponents(slide);
  return slide;
}

function slideOuterHtmlFromDoc(doc: Document, ordinalStart = 1): string[] {
  const roots = findSlideRoots(doc, 'import');
  const extras = bodyRuntimeNodes(doc, roots);
  return roots.map((root, idx) => {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.setAttribute('data-page', String(ordinalStart + idx));
    for (const node of extras) clone.appendChild(node.cloneNode(true));
    return clone.outerHTML;
  });
}

function mergedHeadHtml(docs: Document[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const doc of docs) {
    for (const child of Array.from(doc.head.children)) {
      if (child.tagName.toLowerCase() === 'title') continue;
      const html = child.outerHTML;
      if (seen.has(html)) continue;
      seen.add(html);
      parts.push(html);
    }
  }

  return parts.join('\n');
}

function buildCompatibleDeck(files: HtmlDeckFile[]): HtmlDeckFile | null {
  const docs = files.map((file) => ({
    ...file,
    doc: new DOMParser().parseFromString(file.html, 'text/html'),
  }));
  const compatible = docs
    .map((entry) => ({ ...entry, count: findSlideRoots(entry.doc, 'import').length }))
    .filter((entry) => entry.count > 0);

  if (!compatible.length) return null;

  const multiSlide = compatible.find((entry) => entry.count > 1);
  if (multiSlide) return { fileName: multiSlide.fileName, html: multiSlide.html };
  if (compatible.length === 1) return { fileName: compatible[0]!.fileName, html: compatible[0]!.html };

  const firstDoc = compatible[0]!.doc;
  const title = firstDoc.querySelector('title')?.textContent?.trim() || 'HTML Deck';
  const lang = firstDoc.documentElement.getAttribute('lang') || 'zh-CN';
  let ordinal = 1;
  const slides: string[] = [];

  for (const entry of compatible) {
    const slideHtml = slideOuterHtmlFromDoc(entry.doc, ordinal);
    slides.push(...slideHtml);
    ordinal += slideHtml.length;
  }

  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280, height=720">
<title>${title}</title>
${mergedHeadHtml(compatible.map((entry) => entry.doc))}
</head>
<body>
${slides.join('\n')}
</body>
</html>`;

  return { fileName: 'compatible-deck.html', html };
}

// ─── IndexedDB handle persistence ───────────────────────────────────────────

/**
 * Shared IndexedDB connection. v2 adds the `snapshots` object store used by
 * single-file history (see fs/snapshots.ts). Both stores are created/ensured
 * here so there is exactly one schema version for the `hds-v1` database.
 */
export function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      if (!db.objectStoreNames.contains(IDB_SNAPSHOTS)) {
        const store = db.createObjectStore(IDB_SNAPSHOTS, { keyPath: 'key' });
        store.createIndex('deck', 'deck', { unique: false });
      }
      if (!db.objectStoreNames.contains(IDB_SESSION)) db.createObjectStore(IDB_SESSION);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function persistHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, 'last');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function recallHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get('last');
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ─── Directory picker ────────────────────────────────────────────────────────

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  // showDirectoryPicker is a Chrome-specific API; cast to any to avoid strict TS checks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' }) as FileSystemDirectoryHandle;
  await persistHandle(handle);
  return handle;
}

/** Single-file mode: pick one self-contained .html file (no folder). */
export async function pickFile(): Promise<{ fileName: string; html: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [handle] = (await (window as any).showOpenFilePicker({
    types: [{ description: 'HTML', accept: { 'text/html': ['.html', '.htm'] } }],
    multiple: false,
  })) as FileSystemFileHandle[];
  const file = await handle.getFile();
  const html = await file.text();
  return { fileName: handle.name, html };
}

/** Single-file mode: prompt "save as" and write the working copy, returning its handle. */
export async function saveAsNewFile(suggestedName: string, html: string): Promise<FileSystemFileHandle> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = (await (window as any).showSaveFilePicker({
    suggestedName,
    types: [{ description: 'HTML', accept: { 'text/html': ['.html'] } }],
  })) as FileSystemFileHandle;
  await writeFileHandle(handle, html);
  return handle;
}

/** Single-file mode: write to an already-acquired file handle (no backup dir available). */
export async function writeFileHandle(handle: FileSystemFileHandle, html: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(html);
  await writable.close();
}

export async function verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  // queryPermission / requestPermission are part of File System Access API (Chrome-only)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = handle as any;
  const perm = await h.queryPermission?.({ mode: 'readwrite' }) as string | undefined;
  if (perm === 'granted') return true;
  const req = await h.requestPermission?.({ mode: 'readwrite' }) as string | undefined;
  return req === 'granted';
}

// ─── Reading deck ─────────────────────────────────────────────────────────

/** Count slide sections the same way `parseDeck` does (avoids false positives from strings in script). */
export function deckSlideCount(html: string): number {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return findSlideRoots(doc, 'import').length;
}

export async function findDeckFile(
  dir: FileSystemDirectoryHandle,
): Promise<{ fileName: string; html: string } | null> {
  const htmlFiles: HtmlDeckFile[] = [];
  for await (const [name, entry] of dir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (entry.kind !== 'file' || !/\.html?$/i.test(name)) continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    const html = await file.text();
    htmlFiles.push({ fileName: name, html });
  }
  htmlFiles.sort((a, b) => naturalCompare(a.fileName, b.fileName));
  return buildCompatibleDeck(htmlFiles);
}

export function parseDeck(
  html: string,
  source: 'import' | 'internal' = 'internal',
): { meta: DeckMeta; headHtml: string; slides: SlideState[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const sections = findSlideRoots(doc, source);
  const extras = bodyRuntimeNodes(doc, sections);

  const slides: SlideState[] = sections.map((el, idx) => {
    const normalized = normalizeSlideRoot(doc, el, idx + 1, extras);
    let id = normalized.getAttribute('data-page-id') ?? '';
    if (!id) {
      id = ulid();
      normalized.setAttribute('data-page-id', id);
    }
    const ordinal = parseInt(normalized.getAttribute('data-page') ?? String(idx + 1), 10);
    return { id, ordinal, html: normalized.outerHTML, thumbnail: null };
  });

  // Extract all head content so iframe can inherit styles and fonts
  const headHtml = doc.head.innerHTML;

  const meta: DeckMeta = {
    version: 1,
    title: doc.querySelector('title')?.textContent ?? undefined,
    slides: slides.map(({ id, ordinal }) => ({ id, ordinal })),
    assets: [],
  };

  return { meta, headHtml, slides };
}

// ─── Writing deck ─────────────────────────────────────────────────────────

export async function writeDeck(
  dir: FileSystemDirectoryHandle,
  fileName: string,
  html: string,
  sourceFileName?: string,
): Promise<void> {
  // Safety guard: never overwrite the source file
  if (sourceFileName && fileName === sourceFileName) {
    throw new Error(`Refusing to overwrite source file "${sourceFileName}". Save target must differ from source.`);
  }

  // 1. Write backup first
  await writeBackup(dir, html);

  // 2. Write working copy
  const fh = await dir.getFileHandle(fileName, { create: true });
  const writable = await fh.createWritable();
  await writable.write(html);
  await writable.close();
}

/** Write a timestamped backup snapshot into `.hds-backup/` (folder mode). */
export async function writeBackup(dir: FileSystemDirectoryHandle, html: string): Promise<void> {
  let backupDir: FileSystemDirectoryHandle;
  try {
    backupDir = await dir.getDirectoryHandle(BACKUP_DIR, { create: true });
  } catch {
    return; // silently skip if can't create backup dir
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const fh = await backupDir.getFileHandle(`${ts}.html`, { create: true });
  const writable = await fh.createWritable();
  await writable.write(html);
  await writable.close();

  await pruneBackups(backupDir);
}

async function pruneBackups(backupDir: FileSystemDirectoryHandle): Promise<void> {
  const names: string[] = [];
  for await (const [name] of backupDir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (name.endsWith('.html')) names.push(name);
  }
  names.sort(); // ISO timestamps sort lexicographically = chronologically
  while (names.length > MAX_BACKUPS) {
    const oldest = names.shift()!;
    await backupDir.removeEntry(oldest);
  }
}

// ─── Folder-mode backup listing (history drawer) ────────────────────────────

export interface BackupEntry {
  /** Backup file name, e.g. 2026-06-02T02-56-00-123Z.html */
  name: string;
  /** Epoch ms parsed from the file name. */
  ts: number;
  /** Byte size of the snapshot. */
  size: number;
}

/** Parse a backup file name (ISO with [:.]→-) back to epoch ms. */
function parseBackupTs(name: string): number {
  const base = name.replace(/\.html$/i, '');
  // 2026-06-02T02-56-00-123Z → 2026-06-02T02:56:00.123Z
  const m = base.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
  if (!m) return 0;
  const iso = `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

export async function listBackups(dir: FileSystemDirectoryHandle): Promise<BackupEntry[]> {
  let backupDir: FileSystemDirectoryHandle;
  try {
    backupDir = await dir.getDirectoryHandle(BACKUP_DIR);
  } catch {
    return [];
  }
  const entries: BackupEntry[] = [];
  for await (const [name, entry] of backupDir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (entry.kind !== 'file' || !name.endsWith('.html')) continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    entries.push({ name, ts: parseBackupTs(name), size: file.size });
  }
  entries.sort((a, b) => b.ts - a.ts); // newest first
  return entries;
}

export async function readBackup(dir: FileSystemDirectoryHandle, name: string): Promise<string> {
  const backupDir = await dir.getDirectoryHandle(BACKUP_DIR);
  const fh = await backupDir.getFileHandle(name);
  const file = await fh.getFile();
  return file.text();
}

export async function deleteBackup(dir: FileSystemDirectoryHandle, name: string): Promise<void> {
  const backupDir = await dir.getDirectoryHandle(BACKUP_DIR);
  await backupDir.removeEntry(name);
}

// ─── Asset write ──────────────────────────────────────────────────────────

export async function writeAsset(
  dir: FileSystemDirectoryHandle,
  file: File,
): Promise<string> {
  let assetsDir: FileSystemDirectoryHandle;
  try {
    assetsDir = await dir.getDirectoryHandle('assets', { create: true });
  } catch {
    assetsDir = dir;
  }

  let name = file.name;
  let attempt = 0;
  while (attempt < 100) {
    try {
      await assetsDir.getFileHandle(name);
      // exists – try with suffix
      const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
      const base = file.name.slice(0, file.name.length - ext.length);
      attempt++;
      name = `${base}-${attempt}${ext}`;
    } catch {
      break;
    }
  }

  const fh = await assetsDir.getFileHandle(name, { create: true });
  const writable = await fh.createWritable();
  await writable.write(await file.arrayBuffer());
  await writable.close();

  return `assets/${name}`;
}

// ─── Rebuild full deck HTML after slide edits ──────────────────────────────

export function rebuildDeckHtml(
  originalHtml: string,
  slides: Pick<SlideState, 'id' | 'html'>[],
): string {
  const doc = new DOMParser().parseFromString(originalHtml, 'text/html');
  const oldSections = findSlideRoots(doc);
  const sections = oldSections.length ? oldSections : findSlideRoots(doc, 'import');
  const first = sections[0];
  if (!first || !first.parentElement) return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  const oldRuntimeNodes = bodyRuntimeNodes(doc, sections);
  const parent = first.parentElement;

  // Rebuild the slide list in order (handles add / remove / reorder).
  const newNodes: Element[] = [];
  for (const { html } of slides) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const node = tmp.firstElementChild;
    if (node) newNodes.push(node);
  }

  for (const node of newNodes) parent.insertBefore(node, first);
  sections.forEach((s) => s.remove());
  oldRuntimeNodes.forEach((n) => n.remove());

  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

/**
 * Like rebuildDeckHtml but restores blob: URLs back to original relative paths.
 * Used for export so Puppeteer can resolve the actual files on disk.
 */
export function rebuildDeckHtmlForExport(
  originalHtml: string,
  slides: Pick<SlideState, 'id' | 'html'>[],
  blobToPath: Map<string, string>,
  watermark?: WatermarkConfig,
): string {
  // Rebuild with current edits
  let rebuilt = rebuildDeckHtml(originalHtml, slides);
  // Replace any blob: URLs with their original relative paths
  for (const [blobUrl, relPath] of blobToPath) {
    rebuilt = rebuilt.split(blobUrl).join(relPath);
  }
  if (watermark) rebuilt = applyWatermarkToDeckHtml(rebuilt, watermark);
  return rebuilt;
}
