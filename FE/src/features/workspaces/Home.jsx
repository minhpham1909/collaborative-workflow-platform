import { readCreationDraft, saveCreationDraft, clearCreationDraft } from '../../lib/workspace-creation-draft.js';
import WorkspaceIdentityFields from '../../components/WorkspaceIdentityFields.jsx';
import { defaultWorkspaceIdentity, validWorkspaceSummary, workspaceIdentityBody } from '../../lib/workspace-identity.js';
import CollectionView,{useCollectionView} from '../../components/CollectionView.jsx';
import StudioCarousel from '../../components/StudioCarousel.jsx';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { homeText } from '../../lib/home-text.js';
import {
  EmptyState,
  InlineMessage,
  LoadingState,
} from "../../components/Feedback.jsx";
import useDialogFocus from "../../components/useDialogFocus.js";
import {
  confirmDialog,
  notify,
} from "../../components/NotificationProvider.jsx";
import { homeCopy, workspaceRoleLabel } from "../../lib/ui-copy.js";
import HomeHighlights, {
  HomeDay,
  useHomeHighlights,
} from "./HomeHighlights.jsx";
import StudioCover from "../../components/StudioCover.jsx";
import Icon from "../../components/Icon.jsx";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
import FilterPanel from "../../components/FilterPanel.jsx";
import FormField from "../../components/FormField.jsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { messageFor } from "../../lib/messages.js";
import { useDraftGuard } from "../../lib/draft-navigation.js";
function creationStorage() { try { return window.sessionStorage; } catch { return null; } }
function plain(node) {
  if (!node) return "";
  if (typeof node.plainText === "string") return node.plainText;
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plain).join(" ");
}
export default function Home({ api, user }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => homeText(value, locale, values);
  const [view,setView]=useCollectionView(user.id,'home-workspaces',['grid','list'],'grid');
  const [role, setRole] = useState("all"), [state, setState] = useState("all");
  const [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [data, setData] = useState({ items: [], nextCursor: null }),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [saving, setSaving] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [createError, setCreateError] = useState(""),
    [nameError, setNameError] = useState("");
  const [identity, setIdentity] = useState({ ...defaultWorkspaceIdentity }), [summaryError, setSummaryError] = useState(''), [createdWorkspace, setCreatedWorkspace] = useState(null);
  const pendingCreation = useRef(readCreationDraft(creationStorage(), user.id));
  const [retryReady, setRetryReady] = useState(false);
  const creationText = (vi, en) => locale === 'en' ? en : vi;
  useEffect(() => {
    if (pendingCreation.current) {
      const value = pendingCreation.current; setName(value.name); setIdentity({ summary: value.summary ?? '', icon: value.icon, color: value.color, coverId: value.coverId });
      setUncertain(true); setCreateError(creationText('Có yêu cầu tạo chưa xác định kết quả. Mở form để kiểm tra.', 'A creation request needs verification. Open the form to check its result.'));
    }
  }, []);
  const identityDirty = JSON.stringify(identity) !== JSON.stringify(defaultWorkspaceIdentity);
  const generation = useRef(0),
    mutation = useRef(false);
  useDraftGuard({
    dirty: creating && (Boolean(name) || identityDirty),
    busy: saving,
    busyMessage: t("Đang xử lý yêu cầu. Vui lòng chờ kết quả trước khi rời trang."),
    message: t("Bỏ Workspace đang tạo?"),
    dialogOptions: { cancelLabel: t("Ở lại"), confirmLabel: t("Bỏ thay đổi") },
  });
  const highlights = useHomeHighlights(api, refresh);
  const invalid = from && to && from > to;
  const query = new URLSearchParams({
    limit: "12", role, state,
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();
  async function load(cursor = null, token = generation.current) {
    setBusy(true);
    setError("");
    try {
      const result = await api.request(
        "/workspaces?" +
          query +
          (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      if (token === generation.current) {

        setData((old) => ({
          ...result,
          items: cursor ? [...old.items, ...result.items] : result.items,
        }));
      }
    } catch (e) {
      if (token === generation.current) {
        if (!cursor) setData({ items: [], nextCursor: null });
        setError(messageFor(e));
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    const token = ++generation.current;
    setData({ items: [], nextCursor: null });
    setError("");
    if (invalid) {
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(() => load(null, token), 250);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [query, refresh, invalid]);
  useEffect(() => {
    const search = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !creating) {
        event.preventDefault(); document.getElementById('home-search')?.focus();
      }
    };
    window.addEventListener('keydown', search); return () => window.removeEventListener('keydown', search);
  }, [creating]);
  const panel = useRef(null);
  const closeDialog = useRef(() => {});
  closeDialog.current = async () => {
    if (
      !saving &&
      (!(name || identityDirty) ||
        (await confirmDialog(
          uncertain
            ? creationText('Đóng tạm form? Yêu cầu chưa rõ kết quả sẽ được giữ trong trang này.', 'Close this form temporarily? The pending request stays on this page.')
            : t("Bỏ thông tin Workspace chưa lưu?"),
        )))
    ) {
      setCreating(false);
      if (uncertain) return; // Keep the request and draft available when reopening this form.
      pendingCreation.current = null;
      setName("");
      setIdentity({ ...defaultWorkspaceIdentity }); setSummaryError('');
      setNameError("");

    }
  };
  useDialogFocus(panel, () => closeDialog.current(), creating);
  function completeCreation(result) {
    setCreatedWorkspace(result.workspace); setCreating(false); setUncertain(false); setRetryReady(false);
    clearCreationDraft(creationStorage(), user.id); pendingCreation.current = null; setCreateError(''); setName(''); setIdentity({ ...defaultWorkspaceIdentity }); setSummaryError('');
    setQ(''); setFrom(''); setTo(''); setRole('all'); setState('all');
    notify(t('Đã tạo Workspace.')); setRefresh(v => v + 1);
  }
  async function checkCreation() {
    if (mutation.current || !pendingCreation.current) return;
    mutation.current = true; setSaving(true); setRetryReady(false);
    try {
      const result = await api.request('/workspaces/creation-requests/' + pendingCreation.current.requestId);
      if (result.status === 'completed') completeCreation(result);
      else if (result.status === 'not_found') {
        setRetryReady(true);
        setCreateError(creationText('Chưa tìm thấy kết quả. Có thể gửi lại đúng yêu cầu này; hệ thống sẽ không tạo trùng.', 'No result found. You can resend this same request without creating a duplicate.'));
      }
    } catch (error) { setCreateError(messageFor(error)); }
    finally { mutation.current = false; setSaving(false); }
  }
  async function retryCreation() {
    if (mutation.current || !retryReady || !pendingCreation.current) return;
    mutation.current = true; setSaving(true); setRetryReady(false);
    try { completeCreation(await api.request('/workspaces', { method: 'POST', body: pendingCreation.current })); }
    catch (error) { setCreateError(messageFor(error)); }
    finally { mutation.current = false; setSaving(false); }
  }
  async function create(e) {
    e.preventDefault();
    if (mutation.current || uncertain) return;
    if (!name.trim() || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(name)) {
      setNameError(
        "Tên Workspace chưa hợp lệ. Nhập tên có nội dung, không có ký tự điều khiển.",
      );
      e.currentTarget.querySelector("input")?.focus();
      return;
    }
    if (!validWorkspaceSummary(identity.summary)) { setSummaryError('Mục tiêu cần một dòng, tối đa 500 ký tự.'); return; }
    mutation.current = true;
    setSaving(true);
    setCreateError("");
    try {
      const request = { requestId: crypto.randomUUID(), name, ...workspaceIdentityBody(identity) };
      try { saveCreationDraft(creationStorage(), user.id, request); }
      catch { setCreateError(creationText('Trình duyệt không lưu được mã yêu cầu. Cho phép bộ nhớ phiên rồi thử lại; chưa gửi yêu cầu tạo.', 'Session storage is unavailable. Enable it and retry; no creation request was sent.')); return; }
      pendingCreation.current = request;
      completeCreation(await api.request('/workspaces', { method: 'POST', body: pendingCreation.current }));
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      if (!isUncertainMutation(e)) { clearCreationDraft(creationStorage(), user.id); pendingCreation.current = null; }
      setCreateError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : creationText('Chưa rõ yêu cầu tạo đã hoàn tất chưa. Kiểm tra kết quả trước khi gửi lại.', 'The creation outcome is unknown. Check its result before retrying.'),
      );
    } finally {
      setSaving(false);
      mutation.current = false;
    }
  }
  return (
    <main lang={locale} className="studio-home">
      <section className="hero studio-home-hero">
        <StudioCarousel locale={locale} />
        <div className="home-hero-copy">
          <small>{t("KHÔNG GIAN LÀM VIỆC CỦA BẠN")}</small>
          <h1>{homeCopy[locale].greeting.replace("{name}", () => user.displayName)}</h1>
          <HomeDay data={highlights} />
          <p>
            {t("Chọn một Workspace để bắt đầu. Cùng đội ngũ biến ý tưởng thành công việc.")}
          </p>
        <button
          className="primary"
          disabled={busy}
          onClick={() => {
            setNameError("");
            if (!uncertain) setCreateError("");
            setCreating(true);
          }}
        >
          <Icon name={uncertain ? "refresh" : "plus"} /> {uncertain ? creationText("Kiểm tra yêu cầu", "Check request") : t("Tạo Workspace")}
        </button>
        </div>
      </section>
      <HomeHighlights data={highlights} compact />
      {uncertain && !creating && <InlineMessage tone="info">{creationText('Yêu cầu tạo Workspace đang chờ kiểm tra kết quả.', 'Check the pending Workspace creation result.')}</InlineMessage>}
      {createdWorkspace && <InlineMessage tone="info">{t("Workspace {name} đã sẵn sàng. Bạn có thể bổ sung mô tả chi tiết, mời thành viên và tạo dự án đầu tiên.", { name: createdWorkspace.name })} <a href={`#workspace/${createdWorkspace.id}`}>{t("Tiếp tục thiết lập")}</a><button onClick={() => setCreatedWorkspace(null)} aria-label={t("Đóng hướng dẫn thiết lập")}>{t("Đóng")}</button></InlineMessage>}
      <div className="home-collection-header"><div><p className="home-eyebrow">{t("CÙNG NHAU LÀM VIỆC")}</p><h2>{t("Workspace của bạn")} <span className="home-count">{data.total ?? '—'}</span></h2></div><CollectionView kind="layout" view={view} onChange={setView} locale={locale} labels={[t("Xem Workspace dạng thẻ"),t("Xem Workspace dạng danh sách")]}/></div>
      <div className="home-filters">
      <FilterPanel locale={locale} compact advancedLabel={t("Thời gian")}>
        <label>
          {t("Tìm theo tên hoặc mô tả Workspace")}
          <input
            id="home-search"
            aria-keyshortcuts="Control+K Meta+K"
            type="search"
            placeholder={t("Nhập để tìm kiếm…")}
            maxLength={200}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label>{t("Trạng thái Workspace")}
          <select value={state} onChange={event => setState(event.target.value)}>
            <option value="all">{t("Tất cả trạng thái")}</option><option value="active">{t("Đang hoạt động")}</option><option value="archived">{t("Đã lưu trữ")}</option>
          </select>
        </label>
        <label>
          {t("Từ ngày tạo")}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          {t("Đến ngày tạo")}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          onClick={() => {
            setQ("");
            setFrom("");
            setTo(""); setRole("all"); setState("all");
          }}
        >
          {t("Xóa bộ lọc")}
        </button>
        <button disabled={busy} onClick={() => setRefresh((v) => v + 1)}>
          {t("Làm mới")}
        </button>
      </FilterPanel>
      <div className="home-role-filters" role="group" aria-label={t("Lọc quyền Workspace")}>
        {[['all', 'Tất cả'], ['managed', 'Tôi quản lý'], ['member', 'Thành viên']].map(([key, label]) => <button key={key} aria-pressed={role === key} onClick={() => setRole(key)}>{t(label)}<span>{data.roleCounts?.[key] ?? '—'}</span></button>)}
        {(q || from || to || state !== 'all' || role !== 'all') && <span className="home-filter-summary">{t('Đang áp dụng bộ lọc')}{from || to ? ` · ${from || t('Từ đầu')} → ${to || t('Hiện tại')}` : ''}</span>}
      </div></div>
      {invalid && (
        <InlineMessage>
          {t("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")}
        </InlineMessage>
      )}

      {error && (
        <InlineMessage>
          {t(error)}{" "}
          <button onClick={() => setRefresh((v) => v + 1)}>{t("Thử lại")}</button>
        </InlineMessage>
      )}
      {busy && <LoadingState>{t("Đang tải Workspace…")}</LoadingState>}
      <div className={`cards workspace-cards home-workspace-cards view-${view}`} aria-busy={busy}>
        {!invalid && data.items.map(w => (
          <article className={`card workspace-card home-workspace-card${w.state === 'archived' ? ' is-archived' : ''}`} key={w.id}>
            <div className="home-card-media"><StudioCover id={w.id} coverId={w.coverId} archived={w.state === 'archived'} /><span className="home-role-badge">{workspaceRoleLabel(w.role, locale)}</span>{w.state === 'archived' && <span className="home-archived-badge"><Icon name="archive" />{t("Chỉ đọc")}</span>}</div>
            <div className="home-card-content"><div className="home-card-title"><h2><a href={`#workspace/${w.id}`}>{w.name}</a></h2><span className={'symbol label-color-' + w.color}><Icon name={w.icon} /></span></div>
              <p className="home-card-description">{w.summary || plain(w.description) || t('Không gian để cùng nhau làm việc.')}</p>
              <div className="workspace-metrics"><span><Icon name="people" /><div>{t("Thành viên")}<strong>{t('{count} người', { count: w.memberCount ?? '—' })}</strong></div></span><span><Icon name="folder" /><div>{t("Dự án hoạt động")}<strong>{t('{count} dự án', { count: w.activeProjectCount ?? '—' })}</strong></div></span></div>
              <div className="studio-card-footer"><p className="muted">{t("Tạo {date}", { date: new Date(w.createdAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) })}</p><span className="home-card-action" aria-hidden="true">{t(w.state === 'archived' ? 'Xem Workspace' : 'Mở Workspace')}<Icon name="chevron-right" /></span></div>
            </div>
          </article>
        ))}
      </div>
      {!busy && !error && !invalid && !data.items.length && (
        <EmptyState>
          <h2>
            {q || from || to || role !== 'all' || state !== 'all'
              ? t("Không có Workspace phù hợp")
              : t("Bạn chưa có Workspace")}
          </h2>
          <p>
            {q || from || to || role !== 'all' || state !== 'all'
              ? t("Thử thay đổi từ khóa hoặc bộ lọc.")
              : t("Tạo Workspace đầu tiên để bắt đầu cùng đội ngũ.")}
          </p>
        </EmptyState>
      )}
      {data.nextCursor && (
        <button
          disabled={busy || invalid}
          onClick={() => load(data.nextCursor)}
        >
          {t("Tải thêm")}
        </button>
      )}
      <HomeHighlights data={highlights} details />
      {creating &&
        createPortal(
          <div className="overlay">
            <section
              ref={panel}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-title"
              lang={locale}
              className="dialog"
            >
              <h2 id="create-title">{t("Tạo Workspace")}</h2>
              <form onSubmit={create}>
                <FormField
                  label={t("Tên Workspace")}
                  hint={t("Tối đa 200 ký tự.")}
                  error={nameError ? t(nameError) : nameError}
                >
                  {(props) => (
                    <input
                      {...props}
                      maxLength={200}
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setNameError("");
                      }}
                      disabled={saving || uncertain}
                    />
                  )}
                </FormField>
                <WorkspaceIdentityFields name={name} value={identity} locale={locale} disabled={saving || uncertain} error={summaryError ? t(summaryError) : undefined} onChange={next => { setIdentity(next); setSummaryError(''); }} />
                <p className="muted">{t('Chỉ tên bắt buộc. Mô tả chi tiết và mời thành viên có thể thiết lập sau.')}</p>
                {createError && <InlineMessage>{t(createError)}</InlineMessage>}
                {uncertain && <div className="buttons">
                  <button type="button" disabled={saving} onClick={checkCreation}>{creationText('Kiểm tra kết quả', 'Check result')}</button>
                  {retryReady && <button type="button" disabled={saving} onClick={retryCreation}>{creationText('Gửi lại yêu cầu này', 'Resend this request')}</button>}
                </div>}
                <div className="buttons">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => closeDialog.current()}
                  >
                    {uncertain ? creationText("Đóng tạm", "Close for now") : t("Hủy")}
                  </button>
                  <button className="primary" disabled={saving || uncertain}>
                    {t(saving ? "Đang tạo…" : "Tạo Workspace")}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )}
    </main>
  );
}
