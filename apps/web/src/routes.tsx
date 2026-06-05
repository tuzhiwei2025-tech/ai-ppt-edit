import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteRecord } from 'vite-react-ssg';
import { LocaleLayout } from './components/LocaleLayout.js';
import { LandingPage } from './pages/LandingPage.js';
import { GuidePage } from './pages/GuidePage.js';
import { useDeckStore } from './store/deckStore.js';
import type { Locale } from './i18n/index.js';
import { PrismFluxLoader } from './components/ui/prism-flux-loader.js';

// Lazy so the editor (and Monaco) is never imported during prerender — the
// store starts empty, so HomeRoute always renders the landing page server-side.
const EditorPage = lazy(() =>
  import('./pages/EditorPage.js').then((m) => ({ default: m.EditorPage })),
);

function HomeRoute() {
  const hasDeck = useDeckStore((s) => s.slides.length > 0);
  if (!hasDeck) return <LandingPage />;
  return (
    <Suspense fallback={
      <div className="min-h-screen grid place-items-center bg-[var(--window-bg)]">
        <PrismFluxLoader label="Loading editor" size={34} speed={4} />
      </div>
    }>
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
