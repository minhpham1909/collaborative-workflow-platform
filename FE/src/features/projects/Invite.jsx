import { InlineMessage, LoadingState } from "../../components/Feedback.jsx";
import EmailVerificationActions from "../../components/EmailVerificationActions.jsx";
import { useEffect, useRef, useState } from "react";
import { messageFor } from "../../lib/messages.js";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
export default function Invite({ api, token, user, onAccepted }) {
  const [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let live = true;
    if (!token) {
      setBusy(false);
      setError(
        "Mở lại liên kết lời mời gốc để tiếp tục. Liên kết không được lưu trong trình duyệt.",
      );
      return;
    }
    api
      .raw("/invitations/preview", { method: "POST", body: { token } })
      .then((value) => {
        if (live) setPreview(value.preview);
      })
      .catch((e) => {
        if (live) setError(messageFor(e));
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [token]);
  async function accept() {
    if (pending.current || uncertain) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.request("/invitations/accept", {
        method: "POST",
        body: { token },
      });
      onAccepted(result.workspace.id);
    } catch (e) {
      setError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : "Chưa xác nhận gia nhập. Kiểm tra Workspace ở Trang chủ trước khi thử lại.",
      );
      if (isUncertainMutation(e)) setUncertain(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <main>
      <section className="hero">
        <div>
          <small>CÙNG NHAU LÀM VIỆC</small>
          <h1>Lời mời tham gia Workspace</h1>
        </div>
      </section>
      <section className="project-info">
        {busy && <LoadingState>Đang xử lý lời mời…</LoadingState>}
        {error && <InlineMessage>{error}</InlineMessage>}
        {preview && (
          <>
            <h2>{preview.workspaceName}</h2>
            <p>{preview.inviterDisplayName} mời bạn tham gia.</p>
            <p>
              Hết hạn{" "}
              {new Date(preview.expiresAt).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
            {user.emailVerified ? (
              <button
                className="primary"
                disabled={busy || uncertain}
                onClick={accept}
              >
                Tham gia Workspace
              </button>
            ) : (
              <div>
                <p>
                  Bạn cần xác minh email. Sau khi xác minh, tải lại thông tin
                  tài khoản hoặc mở lại lời mời.
                </p>
                <EmailVerificationActions api={api} />
              </div>
            )}
          </>
        )}
        <p>
          <a href="#home">Về Trang chủ</a>
        </p>
      </section>
    </main>
  );
}
