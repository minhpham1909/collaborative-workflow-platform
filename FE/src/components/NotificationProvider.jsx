import { useShellText } from '../lib/useShellText.js';
import useDialogFocus, { useDialogDepth } from "./useDialogFocus.js";
import { enqueueFeedback } from '../lib/feedback-queue.js';
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
let dispatch = null;
const request = (kind, message, initial = "", options = {}) =>
  new Promise((resolve) =>
    dispatch
      ? dispatch({
          kind,
          message,
          initial,
          options,
          resolve,
          id: crypto.randomUUID(),
        })
      : resolve(kind === "confirm" ? false : null),
  );
export const confirmDialog = (message, options) =>
  request("confirm", message, "", options);
export const inputDialog = (message, initial, options) =>
  request("input", message, initial, options);
export const notify = (message, tone = "success") =>
  dispatch?.({ kind: "toast", message, tone, id: crypto.randomUUID() });
const NotificationContext = createContext(null);
export const useNotifications = () => useContext(NotificationContext);
export default function NotificationProvider({ children }) {
  const [queue, setQueue] = useState([]),
    [toasts, setToasts] = useState([]);
  const pending = useRef(new Set());
  const dialogDepth = useDialogDepth();
  useEffect(() => {
    const cancel = () => {
      for (const item of pending.current)
        item.resolve(item.kind === "confirm" ? false : null);
      pending.current.clear();
      setQueue([]);
    };
    window.addEventListener("workflow:route-committed", cancel);
    const accountChanged = () => { cancel(); setToasts([]); };
    window.addEventListener('workflow:account-changed', accountChanged);
    dispatch = (item) => {
      if (item.kind === "toast") setToasts((old) => enqueueFeedback(old, item));
      else {
        pending.current.add(item);
        setQueue((old) => [...old, item]);
      }
    };
    return () => {
      window.removeEventListener("workflow:route-committed", cancel);
      window.removeEventListener('workflow:account-changed', accountChanged);
      dispatch = null;
      for (const item of pending.current)
        item.resolve(item.kind === "confirm" ? false : null);
      pending.current.clear();
    };
  }, []);
  const item = queue[0];
  function finish(value) {
    if (!pending.current.has(item)) return;
    pending.current.delete(item);
    setQueue((old) => old.slice(1));
    setTimeout(() => item.resolve(value), 0);
  }
  return (
    <NotificationContext.Provider
      value={{ confirm: confirmDialog, input: inputDialog, notify }}
    >
      {children}
      {item &&
        createPortal(
          <SystemDialog key={item.id} item={item} finish={finish} />,
          document.body,
        )}
      {createPortal(
        <div className="toast-stack">
          {!dialogDepth && toasts.length > 0 && (
            <Toast
              toast={toasts[0]}
              remaining={toasts.length - 1}
              onClose={() =>
                setToasts((old) => old.filter((value) => value.id !== toasts[0].id))
              }
            />
          )}
        </div>,
        document.body,
      )}
    </NotificationContext.Provider>
  );
}
function Toast({ toast, onClose, remaining }) {
  const { locale, t } = useShellText();
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const panel = useRef(null);
  useEffect(() => {
    // Feedback text stays click-through; observe pointer position without
    // placing an invisible event-catching layer over the form underneath.
    const move = event => {
      if (event.pointerType !== 'mouse') { setHovered(false); return; }
      const rect = panel.current?.getBoundingClientRect();
      setHovered(Boolean(rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom));
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  useEffect(() => {
    const reserve = () => document.body.style.setProperty('--wf-toast-space', `${(panel.current?.offsetHeight ?? 0) + 32}px`);
    reserve(); const observer = new ResizeObserver(reserve); observer.observe(panel.current);
    return () => { observer.disconnect(); document.body.style.removeProperty('--wf-toast-space'); };
  }, []);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [toast.id, paused]);
  return (
    <div ref={panel} lang={locale} className={`system-toast ${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}
      onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="toast-content"><span>{toast.message}</span>{remaining > 0 && <small>{t('{count} thông báo tiếp theo', { count: remaining })}</small>}</div>
      <button aria-label={t('Đóng thông báo')} onClick={onClose}>
        ×
      </button>
    </div>
  );
}
function SystemDialog({ item, finish }) {
  const { locale, t } = useShellText();
  const panel = useRef(null),
    [value, setValue] = useState(item.initial);
  useDialogFocus(panel, () => finish(item.kind === "confirm" ? false : null));
  return (
    <div className="system-overlay">
      <section
        ref={panel}
        tabIndex={-1}
        lang={locale}
        className={`system-dialog ${item.options.tone === "danger" ? "danger" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-dialog-title"
        aria-describedby="system-dialog-message"
      >
        <span className="dialog-emblem" aria-hidden="true">
          {item.kind === "input"
            ? "↗"
            : item.options.tone === "danger"
              ? "!"
              : "?"}
        </span>
        <h2 id="system-dialog-title">
          {item.kind === "input"
            ? t(item.options.title ?? "Thêm liên kết")
            : t(item.options.title ?? "Xác nhận thao tác")}
        </h2>
        <p id="system-dialog-message">{item.message}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            finish(item.kind === "confirm" ? true : value);
          }}
        >
          {item.kind === "input" && (
            <label>
              {t(item.options.inputLabel ?? "Đường dẫn")}
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                maxLength={item.options.maxLength ?? 2048}
              />
            </label>
          )}
          <div className="buttons">
            <button
              type="button"
              onClick={() => finish(item.kind === "confirm" ? false : null)}
            >
              {t(item.options.cancelLabel ?? "Hủy")}
            </button>
            <button className="primary">
              {item.kind === "input"
                ? t(item.options.confirmLabel ?? "Áp dụng")
                : t(item.options.confirmLabel ?? "Xác nhận")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
