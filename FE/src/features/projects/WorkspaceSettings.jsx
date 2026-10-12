import { projectIcons } from '../../components/ProjectIconPicker.jsx';
import WorkspaceIdentityFields from '../../components/WorkspaceIdentityFields.jsx';
import { workspaceIdentity, workspaceIdentityBody, validWorkspaceSummary, workspaceColors, workspaceCovers } from '../../lib/workspace-identity.js';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workspaceText } from '../../lib/workspace-text.js';
import { InlineMessage, LoadingState } from "../../components/Feedback.jsx";
import { notify } from "../../components/NotificationProvider.jsx";
import FormField from "../../components/FormField.jsx";
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
  onUnavailable,
}) {
  const { locale } = useAuthLocale();
  const t = (value, values) => workspaceText(value, locale, values);
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
  const [identity, setIdentity] = useState(workspaceIdentity), [blockedDraft, setBlockedDraft] = useState('');
  const pending = useRef(false);
  const [fieldErrors, setFieldErrors] = useState({});
  useEffect(() => {
    let live = true;
    setBusy(true);
    setBlockedDraft('');
    setSnapshot(null);
    setError("");
    setNote("");
    setDirty(false);
    onDirty(false);
    setUncertain(false);
    setFieldErrors({});
    (async () => {
      try {
        const workspace = (await api.request(`/workspaces/${id}`)).workspace;
        const user = emailOnly ? (await api.request("/users/me")).user : null;
        if (!live) return;
        setSnapshot(workspace);
        onContext(workspace);
        setGlobal(user?.emailPreferences ?? null);
        setName(workspace.name);
        setIdentity(workspaceIdentity(workspace));
        setDescription(workspace.description ?? envelope(emptyDocument()));
        setOverrides(workspace.emailOverrides);
      } catch (e) {
        if (live) setError(messageFor(e));
        if (live && [401,403,404].includes(e.status)) onUnavailable?.(e);
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
        t("Bỏ thay đổi chưa lưu và tải lại cài đặt Workspace?"),
      ))
    )
      setRevision((v) => v + 1);
  }
  async function submit(e, reset = false) {
    e?.preventDefault();
    if (pending.current || uncertain || !snapshot || (!emailOnly && !snapshot.permissions?.edit) || (emailOnly && !snapshot.permissions?.emailPreferences)) return;
    if (!emailOnly && !validWorkspaceSummary(identity.summary)) { setFieldErrors(old => ({ ...old, summary: t('Mục tiêu cần một dòng, tối đa 500 ký tự.') })); return; }
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
      setFieldErrors({
        name:
          !name.trim() ||
          name.length > 200 ||
          /[\u0000-\u001f\u007f\u2028\u2029]/u.test(name)
            ? t("Tên tối đa 200 ký tự, không để trống hoặc chứa ký tự điều khiển.")
            : "",
        description:
          [
            ...new Intl.Segmenter("vi", { granularity: "grapheme" }).segment(
              description?.plainText ?? "",
            ),
          ].length > 20000
            ? t("Mô tả tối đa 20.000 ký tự hiển thị.")
            : "",
      });
      return;
    }
    if (
      reset &&
      !(await confirmDialog(
        t("Đưa cả bốn loại email về kế thừa cài đặt chung của bạn?"),
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
            : { expectedVersion: snapshot.version, name, description, ...workspaceIdentityBody(identity) },
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
      else setIdentity(workspaceIdentity(next));
      setDirty(false);
      onDirty(false);
      setNote(reset ? t("Đã trở về cài đặt chung.") : t("Đã lưu cài đặt."));
      notify(t("Đã lưu cài đặt Workspace."));
    } catch (e) {
      setError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : t("Chưa xác nhận đã lưu. Tải lại cài đặt để kiểm tra trước khi gửi tiếp."),
      );
      if (isUncertainMutation(e)) setUncertain(true);
      const retainedDraft = [name, identity.summary, t(projectIcons.find(([key]) => key === identity.icon)?.[1] ?? ''), t(workspaceColors.find(([key]) => key === identity.color)?.[1] ?? ''), t(workspaceCovers.find(([key]) => key === identity.coverId)?.[1] ?? ''), description?.plainText ?? ''].filter(Boolean).join('\n\n');
      if (
        [401,403,404].includes(e.status) || ["WORKSPACE_UNAVAILABLE", "OWNER_REQUIRED", "UNAUTHENTICATED"].includes(e.code)
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
            if (!emailOnly) setBlockedDraft(retainedDraft);
          } catch (readError) { onUnavailable?.(readError); }
        } else {
          onUnavailable?.(e);
        }
      }
    } finally {
      pending.current = false;
      setSaving(false);
      onSaving(false);
    }
  }
  return (
    <section lang={locale} className="project-info">
      <div className="section-heading">
        <h2>{emailOnly ? t("Email của tôi trong nhóm") : t("Cài đặt Workspace")}</h2>
        <button disabled={busy || saving} onClick={reload}>
          {t("Tải lại cài đặt")}
        </button>
      </div>
      {busy && <LoadingState>{t("Đang tải cài đặt…")}</LoadingState>}
      {error && <InlineMessage>{t(error)}</InlineMessage>}
      {note && <InlineMessage tone="info">{t(note)}</InlineMessage>}
      {blockedDraft && <div className="workspace-blocked-draft"><FormField label={t('Nội dung chưa lưu')} hint={t('Bạn không còn quyền sửa. Sao chép nội dung trước khi rời trang.')}>{props => <textarea {...props} readOnly value={blockedDraft} />}</FormField></div>}
      {snapshot &&
        ((!emailOnly && !snapshot.permissions?.edit) || (emailOnly && !snapshot.permissions?.emailPreferences) ? (
          <InlineMessage tone="info">
            {emailOnly ? t("Tùy chọn email riêng chỉ dành cho thành viên của Workspace.") : snapshot.state === "archived" ? t("Workspace đang lưu trữ. Mở lại trước khi sửa tên hoặc mô tả.") : t("Chỉ người quản lý hiện tại được sửa thông tin nhóm.")}
          </InlineMessage>
        ) : (
          <form onSubmit={submit}>
            <fieldset disabled={saving || uncertain}>
              {emailOnly ? (
                <>
                  <p>
                    {t("Các lựa chọn này chỉ áp dụng cho bạn trong {name}. Email xác minh và bảo mật không bị tắt.", { name: snapshot.name })}
                  </p>
                  {Object.entries(events).map(([key, label]) => (
                    <div className="email-override" key={key}>
                      <label>
                        {t(label)}
                        <select
                          aria-label={t(label)}
                          value={overrides[key]}
                          onChange={(e) => {
                            setOverrides((old) => ({
                              ...old,
                              [key]: e.target.value,
                            }));
                            setDirty(true);
                          }}
                        >
                          <option value="inherit">{t("Theo cài đặt chung")}</option>
                          <option value="on">{t("Bật")}</option>
                          <option value="off">{t("Tắt")}</option>
                        </select>
                      </label>
                      <p className="muted">
                        {t("Hiện tại:")}{" "}
                        {(
                          overrides[key] === "inherit"
                            ? global?.[key]
                            : overrides[key] === "on"
                        )
                          ? t("Bật")
                          : t("Tắt")}
                        {overrides[key] === "inherit"
                          ? t(" · Kế thừa tài khoản")
                          : t(" · Riêng Workspace này")}
                      </p>
                    </div>
                  ))}
                  <p className="muted">
                    {t("Rời nhóm sẽ xóa các tùy chọn riêng. Gia nhập lại sẽ theo cài đặt chung.")}
                  </p>
                  <a href="#settings">{t("Mở cài đặt email chung")}</a>
                </>
              ) : (
                <>
                  <FormField
                    label={t("Tên Workspace")}
                    hint={t("Tối đa 200 ký tự.")}
                    error={fieldErrors.name ? t(fieldErrors.name) : fieldErrors.name}
                  >
                    {(props) => (
                      <input
                        {...props}
                        maxLength={200}
                        required
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setFieldErrors((old) => ({ ...old, name: "" }));
                          setDirty(true);
                        }}
                      />
                    )}
                  </FormField>
                  <WorkspaceIdentityFields name={name} value={identity} locale={locale} disabled={saving || uncertain} error={fieldErrors.summary} onChange={next => { setIdentity(next); setFieldErrors(old => ({ ...old, summary: '' })); setDirty(true); }} />
                  <RichEditor
                    locale={locale}
                    value={description}
                    label={t("Mô tả Workspace")}
                    limit={20000}
                    readOnly={saving || uncertain}
                    onChange={(value) => {
                      setDescription(value);
                      setFieldErrors((old) => ({ ...old, description: "" }));
                      setDirty(true);
                    }}
                  />
                  {fieldErrors.description && (
                    <InlineMessage className="field-message error">
                      {t(fieldErrors.description)}
                    </InlineMessage>
                  )}
                  <p className="muted">
                    {t("Tên và mô tả được chia sẻ với các thành viên trong nhóm.")}
                  </p>
                </>
              )}
              <div className="buttons">
                {emailOnly && (
                  <button type="button" onClick={() => submit(null, true)}>
                    {t("Trở về cài đặt chung")}
                  </button>
                )}
                <button type="button" onClick={reload}>
                  {t("Hủy thay đổi")}
                </button>
                <button className="primary">
                  {saving ? t("Đang lưu…") : t("Lưu cài đặt")}
                </button>
              </div>
            </fieldset>
          </form>
        ))}
    </section>
  );
}
