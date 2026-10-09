import { InlineMessage } from "./Feedback.jsx";
import { useRef, useState } from "react";
import { messageFor } from "../lib/messages.js";
export default function EmailVerificationActions({ api, translate = value=>value }) {
  const [note, setNote] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function run(action) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      if (action === "resend") {
        await api.request("/auth/verify-email/resend", {
          method: "POST",
          body: {},
        });
        setNote("Yêu cầu gửi lại đã được tiếp nhận.");
      } else {
        await api.restore();
        setNote("Đã tải lại tài khoản.");
      }
    } catch (e) {
      setNote(messageFor(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <button disabled={busy} onClick={() => run("resend")}>
        {translate('Gửi lại email xác minh')}
      </button>{" "}
      <button disabled={busy} onClick={() => run("reload")}>
        {translate('Đã xác minh · Tải lại')}
      </button>
      <InlineMessage tone="info">{translate(note)}</InlineMessage>
    </>
  );
}
