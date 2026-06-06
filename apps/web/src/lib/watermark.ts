import { SLIDE_SELECTOR } from '@ai-ppt-edit/protocol';

export type WatermarkMode = 'center' | 'tiled';

export interface WatermarkConfig {
  text: string;
  mode: WatermarkMode;
  opacity: number;
}

export const DEFAULT_WATERMARK: WatermarkConfig = {
  text: 'AI PPT Edit',
  mode: 'tiled',
  opacity: 0.14,
};

const WATERMARK_SELECTOR = '[data-hds-watermark="true"]';

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_WATERMARK.opacity;
  return Math.max(0.04, Math.min(0.32, value));
}

export function normalizeWatermarkConfig(config: WatermarkConfig): WatermarkConfig {
  const text = config.text.trim() || DEFAULT_WATERMARK.text;
  return {
    text,
    mode: config.mode,
    opacity: clampOpacity(config.opacity),
  };
}

function applyBaseStyles(el: HTMLElement): void {
  el.setAttribute('data-hds-watermark', 'true');
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '2147483647',
    overflow: 'hidden',
    pointerEvents: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    contain: 'layout paint',
  });
}

function createWatermarkNode(doc: Document, rawConfig: WatermarkConfig): HTMLElement {
  const config = normalizeWatermarkConfig(rawConfig);
  const root = doc.createElement('div');
  applyBaseStyles(root);

  if (config.mode === 'center') {
    const mark = doc.createElement('span');
    mark.textContent = config.text;
    Object.assign(mark.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%) rotate(-24deg)',
      font: '700 52px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      letterSpacing: '0',
      lineHeight: '1',
      color: `rgba(12, 18, 28, ${config.opacity})`,
      whiteSpace: 'nowrap',
    });
    root.appendChild(mark);
    return root;
  }

  const tileW = 320;
  const tileH = 160;
  for (let y = -80; y <= 800; y += tileH) {
    for (let x = -180; x <= 1460; x += tileW) {
      const mark = doc.createElement('span');
      mark.textContent = config.text;
      Object.assign(mark.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${tileW}px`,
        transform: 'rotate(-24deg)',
        transformOrigin: 'center',
        textAlign: 'center',
        font: '700 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        letterSpacing: '0',
        lineHeight: '1',
        color: `rgba(12, 18, 28, ${Math.max(0.04, config.opacity * 0.85)})`,
        whiteSpace: 'nowrap',
      });
      root.appendChild(mark);
    }
  }

  return root;
}

export function removeWatermarkFromElement(root: ParentNode): void {
  root.querySelectorAll(WATERMARK_SELECTOR).forEach((node) => node.remove());
}

export function applyWatermarkToSlideHtml(sectionHtml: string, config: WatermarkConfig): string {
  const doc = new DOMParser().parseFromString(sectionHtml, 'text/html');
  const slide = doc.body.firstElementChild as HTMLElement | null;
  if (!slide) return sectionHtml;

  removeWatermarkFromElement(slide);
  if (!slide.style.position) slide.style.position = 'relative';
  slide.appendChild(createWatermarkNode(doc, config));
  return slide.outerHTML;
}

export function applyWatermarkToDeckHtml(html: string, config: WatermarkConfig): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const slides = Array.from(doc.querySelectorAll<HTMLElement>(SLIDE_SELECTOR));
  for (const slide of slides) {
    removeWatermarkFromElement(slide);
    if (!slide.style.position) slide.style.position = 'relative';
    slide.appendChild(createWatermarkNode(doc, config));
  }
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

