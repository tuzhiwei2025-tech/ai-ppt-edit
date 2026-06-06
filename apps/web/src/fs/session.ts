import type { DeckMeta } from '@ai-ppt-edit/protocol';
import type { SlideState } from '../store/deckStore.js';
import { useDeckStore } from '../store/deckStore.js';
import type { WatermarkConfig } from '../lib/watermark.js';
import { DEFAULT_WATERMARK, normalizeWatermarkConfig } from '../lib/watermark.js';
import { IDB_SESSION, openIdb, parseDeck, recallHandle, verifyPermission } from './adapter.js';
import { resolveAssetsInHtml, revokeAssetCache } from './assetResolver.js';

const SESSION_KEY = 'current';
const SESSION_HINT_KEY = 'hds-editor-session';

type EditorSessionRecord = {
  version: 1;
  mode: 'folder' | 'file';
  sourceFileName: string;
  deckFileName: string;
  html: string;
  watermark: WatermarkConfig;
  isDirty: boolean;
  lastSavedAt: number | null;
  savedAt: number;
};

export function hasEditorSessionHint(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SESSION_HINT_KEY) === '1';
}

export async function persistEditorSession(record: Omit<EditorSessionRecord, 'version' | 'savedAt'>): Promise<void> {
  const session: EditorSessionRecord = {
    ...record,
    version: 1,
    watermark: normalizeWatermarkConfig(record.watermark),
    savedAt: Date.now(),
  };

  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_SESSION, 'readwrite');
    tx.objectStore(IDB_SESSION).put(session, SESSION_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  window.localStorage.setItem(SESSION_HINT_KEY, '1');
}

export async function clearEditorSession(): Promise<void> {
  if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_HINT_KEY);

  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_SESSION, 'readwrite');
    tx.objectStore(IDB_SESSION).delete(SESSION_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readEditorSession(): Promise<EditorSessionRecord | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_SESSION, 'readonly');
    const req = tx.objectStore(IDB_SESSION).get(SESSION_KEY);
    req.onsuccess = () => resolve((req.result as EditorSessionRecord | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function resolveSessionAssets(
  record: EditorSessionRecord,
  parsed: { meta: DeckMeta; headHtml: string; slides: SlideState[] },
): Promise<{ dirHandle: FileSystemDirectoryHandle | null; headHtml: string; slides: SlideState[] }> {
  if (record.mode !== 'folder') {
    return { dirHandle: null, headHtml: parsed.headHtml, slides: parsed.slides };
  }

  const dirHandle = await recallHandle();
  if (!dirHandle) return { dirHandle: null, headHtml: parsed.headHtml, slides: parsed.slides };

  const ok = await verifyPermission(dirHandle);
  if (!ok) return { dirHandle: null, headHtml: parsed.headHtml, slides: parsed.slides };

  revokeAssetCache();
  const slides = await Promise.all(
    parsed.slides.map(async (slide) => ({
      ...slide,
      html: await resolveAssetsInHtml(slide.html, dirHandle),
    })),
  );
  const headHtml = await resolveAssetsInHtml(parsed.headHtml, dirHandle);
  return { dirHandle, headHtml, slides };
}

export async function restoreEditorSession(): Promise<boolean> {
  const record = await readEditorSession();
  if (!record?.html) return false;

  try {
    const parsed = parseDeck(record.html, 'import');
    if (!parsed.slides.length) return false;

    const resolved = await resolveSessionAssets(record, parsed);
    useDeckStore.getState().restoreSession({
      dirHandle: resolved.dirHandle,
      mode: resolved.dirHandle ? record.mode : 'file',
      sourceFileName: record.sourceFileName,
      deckFileName: record.deckFileName,
      rawHtml: record.html,
      headHtml: resolved.headHtml,
      meta: parsed.meta,
      slides: resolved.slides,
      currentSlideId: resolved.slides[0]?.id ?? null,
      watermark: record.watermark ?? DEFAULT_WATERMARK,
      isDirty: record.isDirty,
      lastSavedAt: record.lastSavedAt,
    });
    return true;
  } catch (err) {
    console.error('restore editor session failed', err);
    await clearEditorSession().catch(() => undefined);
    return false;
  }
}
