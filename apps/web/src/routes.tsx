/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteRecord } from 'vite-react-ssg';
import { LocaleLayout } from './components/LocaleLayout.js';
import { LandingPage } from './pages/LandingPage.js';
import { GuidePage } from './pages/GuidePage.js';
import { useDeckStore } from './store/deckStore.js';
import type { Locale } from './i18n/index.js';
import { PrismFluxLoader } from './components/ui/prism-flux-loader.js';
import { hasEditorSessionHint, restoreEditorSession } from './fs/session.js';

// Lazy so the editor (and Monaco) is never imported during prerender — the
// store starts empty, so HomeRoute always renders the landing page server-side.
const EditorPage = lazy(() =>
  import('./pages/EditorPage.js').then((m) => ({ default: m.EditorPage })),
);

function EditorLoader({ label }: { label: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-black text-white">
      <PrismFluxLoader label={label} size={34} speed={4} />
    </div>
  );
}

function HomeRoute() {
  const hasDeck = useDeckStore((s) => s.slides.length > 0);
  const [restoring, setRestoring] = useState(() => hasEditorSessionHint());

  useEffect(() => {
    if (hasDeck || !hasEditorSessionHint()) {
      if (restoring) queueMicrotask(() => setRestoring(false));
      return;
    }

    let cancelled = false;
    void restoreEditorSession()
      .then(() => {
        if (!cancelled) setRestoring(false);
      })
      .catch((err) => {
        console.error('restore editor session failed', err);
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasDeck, restoring]);

  if (!hasDeck && restoring) {
    return <EditorLoader label="Restoring editor" />;
  }

  if (!hasDeck) return <LandingPage />;
  return (
    <Suspense fallback={<EditorLoader label="Loading editor" />}>
      <EditorPage />
    </Suspense>
  );
}

function localeChildren(prefix: string) {
  return [
    { index: true, element: <HomeRoute /> },
    { path: 'guide', element: <GuidePage /> },
    // Unknown subpaths fall back to this locale's home instead of a blank shell.
    { path: '*', element: <Navigate to={prefix || '/'} replace /> },
  ];
}

export const routes: RouteRecord[] = [
  { path: '/', element: <LocaleLayout locale={'zh' as Locale} />, children: localeChildren('') },
  { path: '/en', element: <LocaleLayout locale={'en' as Locale} />, children: localeChildren('/en') },
];
