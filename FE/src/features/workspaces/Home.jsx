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
import StudioCover, { studioTone } from "../../components/StudioCover.jsx";
import Icon from "../../components/Icon.jsx";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
import FilterPanel from "../../components/FilterPanel.jsx";
import FormField from "../../components/FormField.jsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { messageFor } from "../../lib/messages.js";
import { useDraftGuard } from "../../lib/draft-navigation.js";
function plain(node) {
  if (!node) return "";
  if (typeof node.plainText === "string") return node.plainText;
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plain).join(" ");
}
export default function Home({ api, user }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => homeText(value, locale, values);
  const [role, setRole] = useState("all"), [state, setState] = useState("all"), [view, setView] = useState("grid");
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
  const generation = useRef(0),
    mutation = useRef(false);
  useDraftGuard({
    dirty: creating && Boolean(name),
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
        if (!cursor) setUncertain(false);
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
      (!name ||
        (await confirmDialog(
          uncertain
            ? t("Đóng form và tải lại để kiểm tra Workspace đã tạo chưa?")
            : t("Bỏ tên Workspace chưa lưu?"),
        )))
    ) {
      setCreating(false);
      setName("");
      setNameError("");
      if (uncertain) {
        setQ("");
        setFrom("");
        setTo("");
        setRole("all");
        setState("all");
        setRefresh((v) => v + 1);
      }
    }
  };
  useDialogFocus(panel, () => closeDialog.current(), creating);
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
    mutation.current = true;
    setSaving(true);
    setCreateError("");
    try {
      await api.request("/workspaces", { method: "POST", body: { name } });
      setCreating(false);
      setName("");
      setQ(""); setFrom(""); setTo(""); setRole("all"); setState("all");
      notify(t("Đã tạo Workspace."));
      setRefresh((v) => v + 1);
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setCreateError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : "Chưa rõ yêu cầu tạo đã hoàn tất chưa. Đóng form và tải lại danh sách trước khi tạo lại.",
      );
    } finally {
      setSaving(false);
      mutation.current = false;
    }
  }
  return (
    <main lang={locale} className="studio-home">
      <section className="hero studio-home-hero">
        <div>
          <small>{t("KHÔNG GIAN LÀM VIỆC CỦA BẠN")}</small>
          <h1>{homeCopy[locale].greeting.replace("{name}", () => user.displayName)}</h1>
          <HomeDay data={highlights} />
          <p>
            {t("Chọn một Workspace để bắt đầu. Cùng đội ngũ biến ý tưởng thành công việc.")}
          </p>
        </div>
        <button
          className="primary"
          disabled={busy || uncertain}
          onClick={() => {
            setNameError("");
            setCreateError("");
            setCreating(true);
          }}
        >
          <Icon name="plus" /> {t("Tạo Workspace")}
        </button>
      </section>
      <HomeHighlights data={highlights} compact />
      <div className="home-collection-header"><div><p className="home-eyebrow">{t("CÙNG NHAU LÀM VIỆC")}</p><h2>{t("Workspace của bạn")} <span className="home-count">{data.total ?? '—'}</span></h2></div><div className="home-view-switch" role="group" aria-label={t("Cách xem Workspace")}><button aria-label={t("Xem Workspace dạng thẻ")} aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Icon name="grid" /></button><button aria-label={t("Xem Workspace dạng danh sách")} aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" /></button></div></div>
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
            <div className="home-card-media"><StudioCover id={w.id} archived={w.state === 'archived'} /><span className="home-role-badge">{workspaceRoleLabel(w.role, locale)}</span>{w.state === 'archived' && <span className="home-archived-badge"><Icon name="archive" />{t("Chỉ đọc")}</span>}</div>
            <div className="home-card-content"><div className="home-card-title"><h2><a href={`#workspace/${w.id}`}>{w.name}</a></h2><span className={'symbol tone-' + studioTone(w.id)}><Icon name={['palette', 'code', 'megaphone'][studioTone(w.id)]} /></span></div>
              <p className="home-card-description">{plain(w.description) || t('Không gian để cùng nhau làm việc.')}</p>
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
                      disabled={saving}
                    />
                  )}
                </FormField>
                {createError && <InlineMessage>{t(createError)}</InlineMessage>}
                <div className="buttons">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => closeDialog.current()}
                  >
                    {t("Hủy")}
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
