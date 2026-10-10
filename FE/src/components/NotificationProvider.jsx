import { useShellText } from '../lib/useShellText.js';
import useDialogFocus from "./useDialogFocus.js";
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
  useEffect(() => {
    const cancel = () => {
      for (const item of pending.current)
        item.resolve(item.kind === "confirm" ? false : null);
      pending.current.clear();
      setQueue([]);
    };
    window.addEventListener("workflow:route-committed", cancel);
    dispatch = (item) => {
      if (item.kind === "toast") setToasts((old) => [...old.slice(-3), item]);
      else {
        pending.current.add(item);
        setQueue((old) => [...old, item]);
      }
    };
    return () => {
      window.removeEventListener("workflow:route-committed", cancel);
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
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onClose={() =>
                setToasts((old) => old.filter((value) => value.id !== toast.id))
              }
            />
          ))}
        </div>,
        document.body,
      )}
    </NotificationContext.Provider>
  );
}
function Toast({ toast, onClose }) {
  const { locale, t } = useShellText();
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [toast.id]);
  return (
    <div lang={locale} className={`system-toast ${toast.tone}`}>
      <span>{toast.message}</span>
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
