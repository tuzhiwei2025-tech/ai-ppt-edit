import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { localePrefix, storeLocale, type Locale } from '../i18n/index.js';
import { useCurrentLocale } from '../hooks/useGuideNav.js';
import { AnimatedThemeToggler } from './ui/animated-theme-toggler.js';

/** Strip the leading /en (if any) to get the locale-agnostic subpath. */
function subpathOf(pathname: string, current: Locale): string {
  if (current === 'en') return pathname.replace(/^\/en/, '') || '/';
  return pathname;
}

/**
 * Toggles between zh / en while preserving the current subpath + hash, and
 * remembers the choice in localStorage so it sticks across visits.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { pathname, hash, search } = useLocation();
  const current = useCurrentLocale();

  const switchTo = (loc: Locale) => {
    if (loc === current) return;
    storeLocale(loc);
    const sub = subpathOf(pathname, current);
    const next = localePrefix(loc) + (sub === '/' ? '' : sub);
    navigate((next || '/') + search + hash);
  };

  const toggleLocale = () => switchTo(current === 'zh' ? 'en' : 'zh');

  return (
    <div className="hds-lang hds-lang-animated" role="group" aria-label={t('language.label')}>
      <button type="button" className="hds-lang-text" onClick={() => switchTo('zh')} aria-pressed={current === 'zh'}>
        {t('language.zh')}
      </button>
      <AnimatedThemeToggler
        pressed={current === 'en'}
        onToggle={toggleLocale}
        sound={false}
        ariaLabel={t('language.label')}
      />
      <button type="button" className="hds-lang-text" onClick={() => switchTo('en')} aria-pressed={current === 'en'}>
        {t('language.en')}
      </button>
    </div>
  );
}
