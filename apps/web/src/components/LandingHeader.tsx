import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGuideNav } from '../hooks/useGuideNav.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import MenuHoverEffects, { type MenuHoverItem } from './ui/menu-hover-effects.js';

type LandingHeaderProps = {
  onOpenEditor?: () => void;
  onOpenFolder?: () => void;
  onOpenSingle?: () => void;
  onRecall?: () => void;
  canOpenFolder?: boolean;
  canOpenSingle?: boolean;
  loading?: boolean;
};

export function LandingHeader({
  onOpenEditor,
  onOpenFolder,
  onOpenSingle,
  onRecall,
  canOpenFolder = false,
  canOpenSingle = false,
  loading = false,
}: LandingHeaderProps) {
  const { t } = useTranslation('landing');
  const { openGuide } = useGuideNav();
  const [scrolled, setScrolled] = useState(false);
  const runAction = (action?: () => void) => () => {
    if (loading) return;
    action?.();
  };
  const navItems: MenuHoverItem[] = [
    ...(canOpenFolder ? [{
      label: t('nav.openFolder'),
      onSelect: runAction(onOpenFolder),
    }] : []),
    ...(canOpenSingle ? [{
      label: t('nav.openSingle'),
      onSelect: runAction(onOpenSingle),
    }] : []),
    ...(canOpenFolder ? [{
      label: t('nav.recall'),
      onSelect: runAction(onRecall),
    }] : []),
    ...(!canOpenFolder && !canOpenSingle ? [{
      label: t('nav.editor'),
      onSelect: onOpenEditor ?? (() => document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' })),
    }] : []),
    {
      label: t('newHome.footer.templates'),
      href: '#templates',
    },
    {
      label: t('newHome.capabilities.nav'),
      href: '#capabilities',
    },
    {
      label: t('nav.guide'),
      onSelect: () => openGuide('generate'),
    },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`hds-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="w-full px-5 sm:px-8 lg:px-12 h-14 flex items-center gap-6">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 shrink-0 transition-opacity hover:opacity-80"
          aria-label={t('nav.homeAria')}
        >
          <img src="/brand-n.png" alt="" className="hds-emblem w-7 h-7" />
          <span className="hds-wordmark text-sm">AI PPT Edit</span>
        </button>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <MenuHoverEffects items={navItems} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
