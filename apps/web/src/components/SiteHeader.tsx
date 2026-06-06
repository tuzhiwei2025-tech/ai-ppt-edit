import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGuideNav } from '../hooks/useGuideNav.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import MenuHoverEffects, { type MenuHoverItem } from './ui/menu-hover-effects.js';

type SiteHeaderProps = {
  onOpenEditor?: () => void;
};

export function SiteHeader({ onOpenEditor }: SiteHeaderProps) {
  const { t } = useTranslation('landing');
  const { openGuide } = useGuideNav();
  const [scrolled, setScrolled] = useState(false);
  const navItems: MenuHoverItem[] = [
    {
      label: t('nav.editor'),
      onSelect: onOpenEditor ?? (() => document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' })),
    },
    {
      label: t('newHome.footer.templates'),
      href: '#templates',
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
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-6">
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
