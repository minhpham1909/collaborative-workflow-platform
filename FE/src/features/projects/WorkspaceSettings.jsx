import { notify } from "../../components/NotificationProvider.jsx";
import { confirmDialog } from "../../components/NotificationProvider.jsx";
import { useEffect, useRef, useState } from "react";
import RichEditor from "../../components/RichEditor.jsx";
import { envelope, emptyDocument } from "../../lib/content.js";
import { messageFor } from "../../lib/messages.js";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
const events = {
  assignment: "Phân công Task",
  comment: "Bình luận mới",
  content: "Nội dung hoặc deadline thay đổi",
  status: "Trạng thái Task thay đổi",
};
export default function WorkspaceSettings({
  api,
  id,
  emailOnly,
  onContext,
  onDirty,
  onSaving,
}) {
  const [snapshot, setSnapshot] = useState(null),
    [global, setGlobal] = useState(null),
    [name, setName] = useState(""),
    [description, setDescription] = useState(null),
    [overrides, setOverrides] = useState({}),
    [busy, setBusy] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [revision, setRevision] = useState(0),
    [dirty, setDirty] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setSnapshot(null);
    setError("");
    setNote("");
    setDirty(false);
    onDirty(false);
    setUncertain(false);
    (async () => {
      try {
        const workspace = (await api.request(`/workspaces/${id}`)).workspace;
        const user = emailOnly ? (await api.request("/users/me")).user : null;
        if (!live) return;
        setSnapshot(workspace);
        onContext(workspace);
        setGlobal(user?.emailPreferences ?? null);
        setName(workspace.name);
        setDescription(workspace.description ?? envelope(emptyDocument()));
        setOverrides(workspace.emailOverrides);
      } catch (e) {
        if (live) setError(messageFor(e));
      } finally {
        if (live) setBusy(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [id, emailOnly, revision]);
  useEffect(() => {
    onDirty(dirty);
  }, [dirty]);
  useEffect(
    () => () => {
      onDirty(false);
      onSaving(false);
    },
    [],
  );
  async function reload() {
    if (
      !dirty ||
      (await confirmDialog(
        "Bỏ thay đổi chưa lưu và tải lại cài đặt Workspace?",
      ))
    )
      setRevision((v) => v + 1);
  }
  async function submit(e, reset = false) {
    e?.preventDefault();
    if (pending.current || uncertain || !snapshot) return;
    if (
      !emailOnly &&
      (!name.trim() ||
        name.length > 200 ||
        /[\u0000-\u001f\u007f\u2028\u2029]/u.test(name) ||
        [
          ...new Intl.Segmenter("vi", { granularity: "grapheme" }).segment(
            description?.plainText ?? "",
          ),
        ].length > 20000)
    ) {
      setError(
        "Tên tối đa 200 ký tự, không để trống; mô tả tối đa 20.000 ký tự hiển thị.",
      );
      return;
    }
    if (
      reset &&
      !(await confirmDialog(
        "Đưa cả bốn loại email về kế thừa cài đặt chung của bạn?",
      ))
    )
      return;
    pending.current = true;
    setSaving(true);
    onSaving(true);
    setError("");
    setNote("");
    try {
      const base = `/workspaces/${id}`;
      const result = await api.request(
        emailOnly
          ? base + (reset ? "/email-overrides/reset" : "/email-overrides")
          : base,
        {
          method: reset ? "POST" : "PATCH",
          body: emailOnly
            ? {
                expectedVersion: snapshot.membershipVersion,
                ...(!reset ? { emailOverrides: overrides } : {}),
              }
            : { expectedVersion: snapshot.version, name, description },
        },
      );
      const next = emailOnly
        ? {
            ...snapshot,
            emailOverrides: result.emailOverrides,
            membershipVersion: result.version,
          }
        : result.workspace;
      setSnapshot(next);
      onContext(next);
      if (emailOnly) setOverrides(result.emailOverrides);
      setDirty(false);
      onDirty(false);
      setNote(reset ? "Đã trở về cài đặt chung." : "Đã lưu cài đặt.");
      notify("Đã lưu cài đặt Workspace.");
    } catch (e) {
      setError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : "Chưa xác nhận đã lưu. Tải lại cài đặt để kiểm tra trước khi gửi tiếp.",
      );
      if (isUncertainMutation(e)) setUncertain(true);
      if (
        ["WORKSPACE_UNAVAILABLE", "OWNER_REQUIRED", "UNAUTHENTICATED"].includes(
          e.code,
        )
      ) {
        setSnapshot(null);
        setDescription(null);
        setName("");
        setOverrides({});
        setGlobal(null);
        setDirty(false);
        onDirty(false);
        if (e.code === "OWNER_REQUIRED") {
          try {
            onContext((await api.request(`/workspaces/${id}`)).workspace);
          } catch {}
        }
      }
    } finally {
      pending.current = false;
      setSaving(false);
      onSaving(false);
    }
  }
  return (
    <section className="project-info">
      <div className="section-heading">
        <h2>{emailOnly ? "Email của tôi trong nhóm" : "Cài đặt Workspace"}</h2>
        <button disabled={busy || saving} onClick={reload}>
          Tải lại cài đặt
        </button>
      </div>
      {busy && <p role="status">Đang tải cài đặt…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {note && <p role="status">{note}</p>}
      {snapshot &&
        (!emailOnly && snapshot.role !== "owner" ? (
          <p>Chỉ chủ sở hữu được sửa thông tin nhóm.</p>
        ) : (
          <form onSubmit={submit}>
            <fieldset disabled={saving || uncertain}>
              {emailOnly ? (
                <>
                  <p>
                    Các lựa chọn này chỉ áp dụng cho bạn trong {snapshot.name}.
                    Email xác minh và bảo mật không bị tắt.
                  </p>
                  {Object.entries(events).map(([key, label]) => (
                    <div className="email-override" key={key}>
                      <label>
                        {label}
                        <select
                          aria-label={label}
                          value={overrides[key]}
                          onChange={(e) => {
                            setOverrides((old) => ({
                              ...old,
                              [key]: e.target.value,
                            }));
                            setDirty(true);
                          }}
                        >
                          <option value="inherit">Theo cài đặt chung</option>
                          <option value="on">Bật</option>
                          <option value="off">Tắt</option>
                        </select>
                      </label>
                      <p className="muted">
                        Hiện tại:{" "}
                        {(
                          overrides[key] === "inherit"
                            ? global?.[key]
                            : overrides[key] === "on"
                        )
                          ? "Bật"
                          : "Tắt"}
                        {overrides[key] === "inherit"
                          ? " · Kế thừa tài khoản"
                          : " · Riêng Workspace này"}
                      </p>
                    </div>
                  ))}
                  <p className="muted">
                    Rời nhóm sẽ xóa các tùy chọn riêng. Gia nhập lại sẽ theo cài
                    đặt chung.
                  </p>
                  <a href="#settings">Mở cài đặt email chung</a>
                </>
              ) : (
                <>
                  <label>
                    Tên Workspace
                    <input
                      maxLength={200}
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setDirty(true);
                      }}
                    />
                  </label>
                  <RichEditor
                    value={description}
                    label="Mô tả Workspace"
                    limit={20000}
                    readOnly={saving || uncertain}
                    onChange={(value) => {
                      setDescription(value);
                      setDirty(true);
                    }}
                  />
                  <p className="muted">
                    Tên và mô tả được chia sẻ với các thành viên trong nhóm.
                  </p>
                </>
              )}
              <div className="buttons">
                {emailOnly && (
                  <button type="button" onClick={() => submit(null, true)}>
                    Trở về cài đặt chung
                  </button>
                )}
                <button type="button" onClick={reload}>
                  Hủy thay đổi
                </button>
                <button className="primary">
                  {saving ? "Đang lưu…" : "Lưu cài đặt"}
                </button>
              </div>
            </fieldset>
          </form>
        ))}
    </section>
  );
}
