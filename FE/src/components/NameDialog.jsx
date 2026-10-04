import { isUncertainMutation } from "../lib/mutation-outcome.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { messageFor } from "../lib/messages.js";
import ProjectIconPicker from "./ProjectIconPicker.jsx";

export default function NameDialog({
  title,
  initial = "",
  initialIcon = "folder",
  withIcon = false,
  onSave,
  onClose,
}) {
  const [icon, setIcon] = useState(initialIcon);
  const [name, setName] = useState(initial),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    close = useRef(null);
  close.current = () => {
    if (
      !pending.current &&
      ((name === initial && icon === initialIcon) ||
        confirm("Bỏ nội dung chưa lưu?"))
    )
      onClose(uncertain);
  };
  useEffect(() => {
    const previous = document.activeElement,
      shell = document.querySelector(".shell");
    shell.inert = true;
    function key(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const nodes = [
          ...document.querySelectorAll(
            ".dialog input:not(:disabled), .dialog button:not(:disabled)",
          ),
        ];
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      shell.removeAttribute("inert");
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  async function submit(e) {
    e.preventDefault();
    if (pending.current || uncertain) return;
    if (!name.trim() || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(name)) {
      setError("Tên chưa hợp lệ.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await onSave(name, icon);
      onClose();
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : "Chưa rõ yêu cầu đã lưu chưa. Đóng form và tải lại dữ liệu trước khi gửi lại.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return createPortal(
    <div className="overlay">
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-title"
      >
        <h2 id="name-title">{title}</h2>
        <form onSubmit={submit}>
          <label>
            Tên Dự án
            <input
              autoFocus
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </label>
          {withIcon && (
            <ProjectIconPicker
              value={icon}
              onChange={setIcon}
              disabled={busy || uncertain}
            />
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="buttons">
            <button
              type="button"
              disabled={busy}
              onClick={() => close.current()}
            >
              Hủy
            </button>
            <button className="primary" disabled={busy || uncertain}>
              {busy ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
