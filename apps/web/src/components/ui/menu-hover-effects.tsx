import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export type MenuHoverItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
};

type MenuHoverEffectsProps = {
  items: MenuHoverItem[];
  className?: string;
};

export default function MenuHoverEffects({ items, className }: MenuHoverEffectsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSelect = (item: MenuHoverItem) => {
    setIsMenuOpen(false);
    item.onSelect?.();
  };

  return (
    <nav className={cn('relative', className)} aria-label="Primary navigation">
      <button
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        className="inline-flex h-9 w-9 items-center justify-center border border-border bg-background text-foreground transition-colors hover:bg-foreground hover:text-background md:hidden"
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
      >
        {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <div
        className={cn(
          'fixed left-5 right-5 top-16 z-50 border border-border bg-background p-3 shadow-[6px_6px_0_var(--button-shadow)] md:static md:block md:min-w-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none',
          isMenuOpen ? 'block' : 'hidden',
        )}
      >
        <ul className="flex flex-col items-stretch gap-1 md:flex-row md:items-center md:gap-1 lg:gap-2">
          {items.map((item) => {
            const content = (
              <>
                <span className="relative z-10 block px-3 py-2 text-xs font-black uppercase tracking-normal text-foreground transition-colors duration-300 group-hover:text-background lg:px-4">
                  {item.label}
                </span>
                <span className="absolute inset-0 origin-center scale-y-[2] border-y-2 border-foreground opacity-0 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100" />
                <span className="absolute left-0 top-0.5 h-full w-full origin-top scale-0 bg-foreground opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
              </>
            );

            return (
              <li key={item.label} className="list-none">
                {item.href ? (
                  <a href={item.href} className="group relative inline-block w-full" onClick={() => handleSelect(item)}>
                    {content}
                  </a>
                ) : (
                  <button type="button" className="group relative inline-block w-full text-left" onClick={() => handleSelect(item)}>
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
