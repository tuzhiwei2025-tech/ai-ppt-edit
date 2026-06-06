import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrutalButton } from './ui/brutal-button.js';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Lightweight confirm sheet reusing the macOS modal chrome. Used for one-off
 * confirmations such as the single-file "save as a copy" explanation.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="hds-modal-backdrop" onClick={onCancel}>
      <div
        className="hds-modal hds-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hds-modal-titlebar">
          <button className="hds-modal-close" onClick={onCancel} aria-label={t('close')} title={t('close')}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
          <span className="hds-modal-title">{title}</span>
        </div>

        <div className="hds-modal-body hds-confirm-body">
          <div className="hds-confirm-message">{message}</div>

          <div className="hds-confirm-actions">
            <BrutalButton
              onClick={onCancel}
              variant="secondary"
              className="hds-confirm-button"
            >
              {cancelLabel ?? t('cancel')}
            </BrutalButton>
            <BrutalButton
              onClick={onConfirm}
              variant="contrast"
              className="hds-confirm-button hds-confirm-button-primary"
            >
              {confirmLabel ?? t('confirm')}
            </BrutalButton>
          </div>
        </div>
      </div>
    </div>
  );
}
