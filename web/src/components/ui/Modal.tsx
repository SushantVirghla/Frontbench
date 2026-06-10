import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus modal container or first focusable
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalRef.current?.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'Tab') {
          // Trap focus
          if (!modalRef.current) return;
          const focusables = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => !el.hasAttribute('disabled'));

          if (focusables.length === 0) return;

          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h3 id="modal-title" className={styles.title}>{title}</h3>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
