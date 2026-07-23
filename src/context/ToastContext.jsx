import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiLoader, FiXCircle, FiX } from 'react-icons/fi';

const ToastContext = createContext(null);
const tones = {
  success: { icon: FiCheckCircle, border: 'border-[#CFE2D4]', text: 'text-[#1E4D3A]', bar: 'bg-[#1E4D3A]' },
  error: { icon: FiXCircle, border: 'border-[#E9C8C1]', text: 'text-[#9A392F]', bar: 'bg-[#9A392F]' },
  warning: { icon: FiAlertTriangle, border: 'border-[#E6D4A8]', text: 'text-[#8A6424]', bar: 'bg-[#C89B3C]' },
  info: { icon: FiInfo, border: 'border-[#CBDCE7]', text: 'text-[#2E5B80]', bar: 'bg-[#2E5B80]' },
  loading: { icon: FiLoader, border: 'border-[#DDE5DF]', text: 'text-[#1E4D3A]', bar: 'bg-[#1E4D3A]' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const inputRef = useRef(null);

  const dismissToast = useCallback((id) => setToasts((items) => items.filter((toast) => toast.id !== id)), []);
  const showToast = useCallback((message, type = 'success', options = {}) => {
    const normalizedType = tones[type] ? type : 'info';
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = options.duration ?? (normalizedType === 'loading' ? 0 : 3600);
    setToasts((items) => [...items.slice(-3), { id, message, type: normalizedType, duration }]);
    if (duration) window.setTimeout(() => dismissToast(id), duration);
    return id;
  }, [dismissToast]);

  const confirmAction = useCallback((options = {}) => new Promise((resolve) => {
    setDialog({ kind: 'confirm', title: options.title || 'Please confirm', message: options.message || 'Are you sure you want to continue?', confirmLabel: options.confirmLabel || 'Confirm', destructive: Boolean(options.destructive), resolve });
  }), []);
  const promptAction = useCallback((options = {}) => new Promise((resolve) => {
    setDialog({ kind: 'prompt', title: options.title || 'Add details', message: options.message || '', confirmLabel: options.confirmLabel || 'Continue', placeholder: options.placeholder || '', defaultValue: options.defaultValue || '', resolve });
    window.setTimeout(() => inputRef.current?.focus(), 100);
  }), []);
  const resolveDialog = useCallback((value) => {
    dialog?.resolve(value);
    setDialog(null);
  }, [dialog]);

  const value = useMemo(() => ({ showToast, dismissToast, confirmAction, promptAction }), [showToast, dismissToast, confirmAction, promptAction]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-[calc(var(--announcement-height)+var(--navbar-height)+12px)] z-[100] grid w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 gap-3 sm:left-auto sm:right-5 sm:top-24 sm:w-full sm:translate-x-0" aria-live="polite" aria-relevant="additions">
        <AnimatePresence>
          {toasts.map((toast) => {
            const tone = tones[toast.type];
            const Icon = tone.icon;
            return (
              <motion.div role={toast.type === 'error' ? 'alert' : 'status'} key={toast.id} initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24, scale: 0.98 }} transition={{ duration: 0.2 }} className={`pointer-events-auto relative overflow-hidden rounded-2xl border bg-white shadow-[0_18px_50px_rgba(36,48,41,.16)] ${tone.border}`}>
                <div className="flex min-h-14 items-start gap-3 px-4 py-3.5">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.text} ${toast.type === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <p className="min-w-0 flex-1 text-sm font-semibold leading-6 text-[#243029]">{toast.message}</p>
                  <button type="button" onClick={() => dismissToast(toast.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#68706B] hover:bg-[#F3EFE6]" aria-label="Dismiss notification"><FiX /></button>
                </div>
                {toast.duration ? <motion.span className={`absolute bottom-0 left-0 h-1 ${tone.bar}`} initial={{ width: '100%' }} animate={{ width: 0 }} transition={{ duration: toast.duration / 1000, ease: 'linear' }} aria-hidden="true" /> : null}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {dialog ? (
          <motion.div className="fixed inset-0 z-[110] grid place-items-end bg-[#14251D]/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && resolveDialog(dialog.kind === 'prompt' ? null : false)}>
            <motion.form className="w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-7" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" onSubmit={(event) => { event.preventDefault(); resolveDialog(dialog.kind === 'prompt' ? inputRef.current?.value ?? '' : true); }}>
              <h2 id="app-dialog-title" className="font-display text-3xl font-semibold text-[#243029]">{dialog.title}</h2>
              {dialog.message ? <p className="mt-2 text-sm leading-6 text-[#68706B]">{dialog.message}</p> : null}
              {dialog.kind === 'prompt' ? <textarea ref={inputRef} defaultValue={dialog.defaultValue} placeholder={dialog.placeholder} className="mt-5 min-h-28 w-full resize-y rounded-2xl border border-[#DCD4C7] bg-[#FAF8F2] px-4 py-3 text-sm outline-none focus:border-[#1E4D3A] focus:ring-2 focus:ring-[#1E4D3A]/10" /> : null}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => resolveDialog(dialog.kind === 'prompt' ? null : false)} className="h-11 rounded-full border border-[#DCD4C7] text-sm font-semibold text-[#243029]">Cancel</button>
                <button type="submit" className={`h-11 rounded-full text-sm font-semibold text-white ${dialog.destructive ? 'bg-[#9A392F]' : 'bg-[#1E4D3A]'}`}>{dialog.confirmLabel}</button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
