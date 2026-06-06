/**
 * CanvasFrame – renders a single slide in a sandboxed iframe.
 * Communicates with editor-runtime via postMessage.
 */
import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import type { HostMessage, RuntimeMessage } from '@ai-ppt-edit/protocol';
import RUNTIME_SOURCE from 'virtual:editor-runtime';
import { useDeckStore } from '../store/deckStore.js';

export interface CanvasHandle {
  sendMessage: (msg: HostMessage) => void;
}

interface CanvasFrameProps {
  /** Outer HTML of the div-based slide root */
  sectionHtml: string;
  /** Full <head> innerHTML from the original document (styles, fonts, etc.) */
  headHtml?: string;
  /** Base URL so relative assets resolve (file:// or blob:) */
  assetsBaseUrl: string;
  onMessage?: (msg: RuntimeMessage) => void;
  /** Optional external ref to the iframe element */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export function CanvasFrame({ sectionHtml, headHtml = '', assetsBaseUrl, onMessage, iframeRef: externalRef }: CanvasFrameProps) {
  const internalRef = useRef<HTMLIFrameElement>(null);
  const iframeRef = externalRef ?? internalRef;
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; });

  // Build srcdoc – inject original head so styles/fonts are preserved.
  // Frozen on first render of this mounted instance: the iframe is the live
  // source of truth, so in-iframe edits (which echo back as new sectionHtml)
  // must NOT rewrite srcDoc and reload it. External changes (undo/redo/restore/
  // slide switch) remount this component via a `key`, rebuilding srcDoc fresh.
  const [srcdoc] = useState(() => `<!doctype html><html><head>
<meta charset="UTF-8">
<base href="${assetsBaseUrl}">
${headHtml}
<style>
  html,body{
    width:1280px;height:720px;
    overflow:hidden;
    /* Keep body constraints but don't override slide bg */
    margin:0;padding:0;
    scroll-snap-type:none !important;
  }
  /* Remove body-level centering/gap from original layout */
  body{display:block !important;gap:0 !important;padding:0 !important;}
  /* Ensure the extracted slide fills the viewport */
  div.slide,div[class~="slide"],div[class~="slide-container"]{
    width:1280px !important;
    min-height:720px !important;
    max-height:720px !important;
    flex-shrink:0 !important;
  }
</style>
</head><body>${sectionHtml}<script data-hds-runtime>${RUNTIME_SOURCE}${'<'}/script></body></html>`);

  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      if (evt.source !== iframeRef.current?.contentWindow) return;
      onMessageRef.current?.(evt.data as RuntimeMessage);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [iframeRef]);

  // Expose postToRuntime via data attribute so parent can call it
  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    (el as HTMLIFrameElement & { postToRuntime?: (msg: HostMessage) => void }).postToRuntime = (msg) => {
      el.contentWindow?.postMessage(msg, '*');
    };
  }, [iframeRef]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox="allow-same-origin allow-scripts"
      style={{ width: 1280, height: 720, border: 'none', display: 'block' }}
      title="slide-canvas"
    />
  );
}

/** Scale canvas to fill container width, maintain 16:9 */
export const ScaledCanvas = forwardRef<CanvasHandle, CanvasFrameProps & { containerWidth: number }>(
  function ScaledCanvas(props, ref) {
    const { containerWidth, ...rest } = props;
    const scale = containerWidth / 1280;
    const setSelection = useDeckStore((s) => s.setSelection);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useImperativeHandle(ref, () => ({
      sendMessage: (msg: HostMessage) => {
        iframeRef.current?.contentWindow?.postMessage(msg, '*');
      },
    }));

    const handleMsg = useCallback((msg: RuntimeMessage) => {
      if (msg.type === 'select') {
        setSelection({
          selector: msg.selector,
          tagName: msg.tagName,
          bbox: msg.bbox as unknown as DOMRect,
          styleSnapshot: msg.styleSnapshot,
          attrs: msg.attrs,
          text: msg.text,
          layer: msg.layer,
          rect: msg.rect,
        });
      }
      if (msg.type === 'clear-select') setSelection(null);
      props.onMessage?.(msg);
    }, [props, setSelection]);

    return (
      <div
        style={{
          width: containerWidth,
          height: Math.round(containerWidth * (720 / 1280)),
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: 1280,
            height: 720,
          }}
        >
          <CanvasFrame {...rest} iframeRef={iframeRef} onMessage={handleMsg} />
        </div>
      </div>
    );
  }
);
