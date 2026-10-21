// Shared UI components. Spec: DESIGN.md §7.
import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import './ui.css';

export const Button = forwardRef(function Button({ variant = 'primary', size, block, loading, onDark, className, children, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        'ui-btn',
        `ui-btn--${variant}`,
        size === 'sm' && 'ui-btn--sm',
        block && 'ui-btn--block',
        onDark && 'ui-btn--on-dark',
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 size={18} className="ui-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

// Icon-only buttons must have a Thai aria-label (DESIGN.md §9).
export function IconButton({ label, className, children, ...props }) {
  return (
    <button className={cn('ui-icon-btn', className)} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function Card({ workspace, className, ...props }) {
  return <div className={cn('ui-card', workspace && 'ui-card--workspace', className)} {...props} />;
}

export function Field({ label, error, id, className, ...inputProps }) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn('ui-field', className)}>
      {label && <label className="ui-field__label" htmlFor={id}>{label}</label>}
      <input
        id={id}
        className="ui-input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        {...inputProps}
      />
      {error && (
        <span className="ui-field__error" id={errorId}>
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </span>
      )}
    </div>
  );
}

export function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span className={cn('ui-badge', `ui-badge--${tone}`, className)}>
      {Icon && <Icon size={14} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Chip({ onPhoto, className, children, ...props }) {
  return <span className={cn('ui-chip', onPhoto && 'ui-chip--on-photo', className)} {...props}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="ui-empty">
      {Icon && (
        <div className="ui-empty__icon" aria-hidden="true">
          <Icon size={40} />
        </div>
      )}
      <h3 className="ui-empty__title">{title}</h3>
      {text && <p className="ui-empty__text">{text}</p>}
      {action && <div className="ui-empty__action">{action}</div>}
    </div>
  );
}

// Bottom sheet on mobile, centered modal on desktop. Replaces window.confirm().
export function Dialog({ open, onClose, title, children, actions }) {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ui-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            className="ui-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ui-dialog__handle" aria-hidden="true" />
            {title && <h2 className="ui-dialog__title">{title}</h2>}
            {children && <div className="ui-dialog__body">{children}</div>}
            {actions && <div className="ui-dialog__actions">{actions}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Toast (replaces window.alert) ----------
const ToastContext = createContext(null);
const TOAST_ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((message, { tone = 'info', action, duration = 4000 } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-2), { id, message, tone, action }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="ui-toast-region" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = TOAST_ICONS[t.tone] || Info;
            return (
              <motion.div
                key={t.id}
                className="ui-toast"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Icon size={18} className={`ui-toast__icon ui-toast__icon--${t.tone}`} aria-hidden="true" />
                <span className="ui-toast__msg">{t.message}</span>
                {t.action && (
                  <button
                    className="ui-toast__action"
                    onClick={() => { t.action.onClick(); dismiss(t.id); }}
                  >
                    {t.action.label}
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// Falls back to window.alert when rendered outside the provider.
export function useToast() {
  return useContext(ToastContext) || ((message) => window.alert(message));
}
