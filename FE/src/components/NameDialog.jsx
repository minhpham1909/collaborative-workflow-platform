import { organizationText } from '../lib/organization-text.js';
import { InlineMessage } from "./Feedback.jsx";
import useDialogFocus from "./useDialogFocus.js";
import { confirmDialog } from "./NotificationProvider.jsx";
import { isUncertainMutation } from "../lib/mutation-outcome.js";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { messageFor } from "../lib/messages.js";
import ProjectIconPicker from "./ProjectIconPicker.jsx";
import FormField from "./FormField.jsx";
import { useDraftGuard } from "../lib/draft-navigation.js";

export default function NameDialog({
  title,
  locale = "vi",
  initial = "",
  initialIcon = "folder",
  withIcon = false,
  label = "Tên Dự án",
  submitLabel = "Lưu",
  children,
  onSave,
  onClose,
}) {
  const t = value => organizationText(value, locale);
  const [icon, setIcon] = useState(initialIcon);
  const [name, setName] = useState(initial),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const panel = useRef(null);
  const pending = useRef(false),
    close = useRef(null);
  useDraftGuard({
    dirty: name !== initial || icon !== initialIcon,
    busy,
    message: t("Bỏ nội dung chưa lưu?"),
    dialogOptions: { cancelLabel: t("Ở lại"), confirmLabel: t("Bỏ thay đổi") },
  });
  close.current = async () => {
    if (
      !pending.current &&
      ((name === initial && icon === initialIcon) ||
        (await confirmDialog(t("Bỏ nội dung chưa lưu?"))))
    )
      onClose(uncertain);
  };
  useDialogFocus(panel, () => close.current());
  async function submit(e) {
    e.preventDefault();
    if (pending.current || uncertain) return;
    if (!name.trim() || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(name)) {
      setNameError(
        "Nhập tên có nội dung, không chứa ký tự xuống dòng hoặc điều khiển.",
      );
      e.currentTarget.querySelector("input")?.focus();
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
        ref={panel}
        tabIndex={-1}
        lang={locale}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-title"
      >
        <h2 id="name-title">{title}</h2>
        {children}
        <form onSubmit={submit}>
          <FormField
            label={label}
            error={nameError ? t(nameError) : nameError}
            hint={t("Tối đa 200 ký tự.")}
          >
            {(props) => (
              <input
                {...props}
                required
                maxLength={200}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError("");
                }}
                disabled={busy}
              />
            )}
          </FormField>
          {withIcon && (
            <ProjectIconPicker
              locale={locale}
              value={icon}
              onChange={setIcon}
              disabled={busy || uncertain}
            />
          )}
          {error && <InlineMessage>{t(error)}</InlineMessage>}
          <div className="buttons">
            <button
              type="button"
              disabled={busy}
              onClick={() => close.current()}
            >
              {t("Hủy")}
            </button>
            <button className="primary" disabled={busy || uncertain}>
              {busy ? t("Đang lưu…") : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
