import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workspaceText } from '../../lib/workspace-text.js';
import {
  EmptyState,
  InlineMessage,
  LoadingState,
} from "../../components/Feedback.jsx";
import useDialogFocus from "../../components/useDialogFocus.js";
import FilterPanel from "../../components/FilterPanel.jsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import WorkspaceModeration, { BanDialog } from './WorkspaceModeration.jsx';
import AddWorkspaceMember from './AddWorkspaceMember.jsx';
import { workspaceRoleLabel } from '../../lib/ui-copy.js';
import '../../features/organizations/team.css';
import './team.css';
import Avatar from "../../components/Avatar.jsx";
import { messageFor } from "../../lib/messages.js";
import { mayLeaveDrafts, useDraftGuard } from "../../lib/draft-navigation.js";
const date = (value, locale = "vi") =>
  new Date(value).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const states = {
  active: "Còn hiệu lực",
  expired: "Hết hạn",
  accepted: "Đã nhận",
  revoked: "Đã thu hồi",
};
const delivery = {
  pending: "Chờ gửi",
  processing: "Đang gửi",
  sent: "Dịch vụ gửi đã nhận",
  failed: "Gửi thất bại",
  cancelled: "Đã hủy gửi",
};
export default function Team({ api, id, invitations, onContext, onUnavailable }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => workspaceText(value, locale, values);
  const [workspace, setWorkspace] = useState(null),
    [data, setData] = useState({ items: [] }),
    [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [type, setType] = useState("all"),
    [state, setState] = useState("all"),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [action, setAction] = useState(null),
    [revision, setRevision] = useState(0);
  const generation = useRef(0),
    invalid = from && to && from > to;
  const query = new URLSearchParams({
    limit: "12",
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(invitations ? { type, state } : {}),
  }).toString();
  async function load(cursor = null, token = generation.current) {
    setBusy(true);
    setError("");
    try {
      const context = (await api.request(`/workspaces/${id}`)).workspace;
      if (token !== generation.current) return;
      setWorkspace(context);
      onContext(context);
      if (invitations && (!context.permissions?.manage || context.organizationId)) {
        setData({ items: [] });
        setAction(null);
        return;
      }
      const result = await api.request(
        `/workspaces/${id}/${invitations ? "invitations" : "members"}?${query}${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`,
      );
      if (token === generation.current)
        setData((old) => ({
          ...result,
          items: cursor ? [...old.items, ...result.items] : result.items,
        }));
    } catch (e) {
      if (token === generation.current) {
        setError(messageFor(e));
        setData({ items: [] });
        setWorkspace(null);
        setAction(null);
        if ([401, 403, 404].includes(e.status)) onUnavailable?.(e);
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    const token = ++generation.current;
    setData({ items: [] });
    setBusy(!invalid);
    if (invalid) return;
    const timer = setTimeout(() => load(null, token), 250);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [id, query, revision]);
  const owner = workspace?.permissions?.manage === true;
  return (
    <section lang={locale}>
      <div className="section-heading">
        <h2>{invitations ? t("Lời mời tham gia") : t("Thành viên trong nhóm")}</h2>
        <div className="buttons">
          <button disabled={busy} onClick={() => setRevision((v) => v + 1)}>
            {t("Làm mới danh sách")}
          </button>
          {invitations && workspace?.permissions?.invite && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => setAction({ kind: "invite" })}
            >
              {t("+ Tạo lời mời")}
            </button>
          )}
          {!invitations && owner && workspace?.organizationId && workspace.state !== 'archived' && <button className="primary" disabled={busy} onClick={() => setAction({ kind: 'add' })}>{t("Thêm thành viên nội bộ")}</button>}
        </div>
      </div>
      {invitations && workspace && (!workspace.permissions?.manage || workspace.organizationId) ? (
        <InlineMessage tone="info">
          {t("Lời mời chỉ được tạo bởi Owner của Workspace độc lập đang hoạt động. Workspace thuộc tổ chức dùng luồng phân bổ thành viên của tổ chức.")}
        </InlineMessage>
      ) : (
        <>
          <FilterPanel
            locale={locale}
            compact
            advancedLabel={t("Bộ lọc")}
            sortLabel={invitations ? t("Mới tạo trước") : t("Mới tham gia trước")}
          >
            <label>
              {invitations ? t("Tìm email người nhận") : t("Tìm tên thành viên")}
              <input
                type="search"
                placeholder={t("Nhập để tìm kiếm…")}
                maxLength={200}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {invitations && (
              <>
                <label>
                  {t("Loại lời mời")}
                  <select
                    aria-label={t("Cách mời")}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="all">{t("Tất cả")}</option>
                    <option value="EMAIL">Email</option>
                    <option value="LINK">{t("Liên kết")}</option>
                  </select>
                </label>
                <label>
                  {t("Hiệu lực")}
                  <select
                    aria-label={t("Hiệu lực")}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    <option value="all">{t("Tất cả")}</option>
                    {Object.entries(states).map(([key, value]) => (
                      <option key={key} value={key}>
                        {t(value)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label>
              {t(invitations ? "Từ ngày tạo" : "Từ ngày gia nhập")}
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              {t(invitations ? "Đến ngày tạo" : "Đến ngày gia nhập")}
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
                setTo("");
                setType("all");
                setState("all");
              }}
            >
              {t("Xóa bộ lọc")}
            </button>
          </FilterPanel>
          <p className="muted">
            {t(invitations ? "Mới tạo trước · Thời gian Việt Nam · Tìm kiếm trên toàn danh sách có quyền xem" : "Mới gia nhập trước · Thời gian Việt Nam · Tìm kiếm trên toàn danh sách có quyền xem")}
          </p>
          {invalid && (
            <InlineMessage>
              {t("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")}
            </InlineMessage>
          )}
          {error && <InlineMessage>{t(error)}</InlineMessage>}
          {busy && <LoadingState>{t("Đang tải danh sách…")}</LoadingState>}
          <div className="team-table-wrap"><table className="team-table" aria-label={invitations ? t("Lời mời Workspace") : t("Thành viên Workspace")} aria-busy={busy}><thead><tr><th>{invitations ? t("Người nhận / loại") : t("Thành viên")}</th><th>{invitations ? t("Trạng thái") : t("Vai trò Workspace")}</th><th>{invitations ? t("Ngày tạo / hết hạn") : t("Ngày gia nhập")}</th><th>{t("Thao tác")}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id ?? item.userId}><td data-label={t("Thành viên")}>{invitations ? <strong>{item.email ?? t("Liên kết tham gia")}</strong> : <div className="team-person"><Avatar user={item} /><strong>{item.displayName}</strong></div>}</td><td data-label={invitations ? t("Trạng thái") : t("Vai trò Workspace")}><span className="team-role">{invitations ? t(states[item.state]) : workspaceRoleLabel(item.role, locale)}</span>{invitations && item.emailDelivery && <small>{t("Email: {state}", { state: t(delivery[item.emailDelivery]) })}</small>}</td><td data-label={t(invitations ? "Ngày tạo / hết hạn" : "Ngày gia nhập")}>{date(item.joinedAt ?? item.createdAt, locale)}{invitations && <small>{t("Hết hạn {date}", { date: date(item.expiresAt, locale) })}</small>}</td><td data-label={t("Thao tác")}><div className="team-member-actions">{invitations ? owner && item.state === 'active' && <><button disabled={busy} onClick={() => setAction({ kind: 'revoke', item })}>{t("Thu hồi")}</button>{workspace.state !== 'archived' && item.emailDelivery === 'failed' && <button disabled={busy} onClick={() => setAction({ kind: 'retry', item })}>{t("Thử gửi lại email")}</button>}</> : <>{item.permissions?.remove && <button disabled={busy} onClick={() => setAction({ kind: 'remove', item })}>{t("Gỡ khỏi nhóm")}</button>}{item.permissions?.ban && <button disabled={busy} onClick={() => setAction({ kind: 'ban', item })}>{t("Chặn truy cập")}</button>}{item.permissions?.transfer && <button disabled={busy} onClick={() => setAction({ kind: 'transfer', item })}>{t("Chuyển quyền sở hữu")}</button>}</>}</div></td></tr>)}</tbody></table></div>
          {!busy && !error && !invalid && !data.items.length && (
            <EmptyState>
              {t(invitations ? "Không có lời mời phù hợp." : "Không có thành viên phù hợp.")}
            </EmptyState>
          )}
          {data.nextCursor && (
            <button disabled={busy} onClick={() => load(data.nextCursor)}>
              {t("Tải thêm")}
            </button>
          )}
        </>
      )}
      {!invitations && workspace && (
        <section className="project-info">
          <h3>{t("Tư cách thành viên của bạn")}</h3>
          {!workspace.permissions?.leave ? (
            <p>
              {t("Owner cần chuyển quyền sở hữu, Manager cần được thay thế trước khi rời. Quản trị tổ chức chưa tham gia Workspace không có membership để rời.")}
            </p>
          ) : (
            <>
              <p>
                {t("Rời nhóm sẽ mất quyền truy cập Workspace và đưa tùy chọn email riêng về mặc định.")}
              </p>
              <button
                disabled={busy}
                onClick={() => setAction({ kind: "leave" })}
              >
                {t("Rời Workspace")}
              </button>
            </>
          )}
        </section>
      )}
      {!invitations && owner && workspace && <WorkspaceModeration api={api} workspace={workspace} />}
      {action?.kind === 'ban' && workspace && <BanDialog api={api} workspace={workspace} member={action.item} onClose={() => { setAction(null); setRevision(v => v + 1); }} />}
      {action?.kind === 'add' && workspace && <AddWorkspaceMember api={api} workspace={workspace} onClose={() => { setAction(null); setRevision(v => v + 1); }} />}
      {action && !['ban', 'add'].includes(action.kind) && workspace && (
        <TeamAction
          api={api}
          workspace={workspace}
          action={action}
          onClose={() => {
            if (action.kind === "invite") { setQ(""); setFrom(""); setTo(""); setType("all"); setState("all"); }
            setAction(null);
            setRevision((v) => v + 1);
          }}
        />
      )}
    </section>
  );
}
function TeamAction({ api, workspace, action, onClose }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => workspaceText(value, locale, values);
  const [type, setType] = useState("EMAIL"),
    [email, setEmail] = useState(""),
    [confirmName, setConfirmName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState(null),
    [blocked, setBlocked] = useState(false),
    [copied, setCopied] = useState("");
  const [left, setLeft] = useState(false);
  useEffect(() => {
    if (left && !busy) location.hash = "home";
  }, [left, busy]);
  useDraftGuard({
    dirty:
      (action.kind === "invite" && !result && Boolean(email || type !== "EMAIL")) || (action.kind === 'transfer' && Boolean(confirmName)),
    busy,
    message: t(action.kind === 'transfer' ? "Bỏ xác nhận chuyển quyền sở hữu chưa gửi?" : "Bỏ lời mời đang soạn?"),
    dialogOptions: { confirmLabel: t("Bỏ thay đổi"), cancelLabel: t("Ở lại") },
    busyMessage: t("Đang xử lý yêu cầu. Vui lòng chờ kết quả trước khi rời trang."),
  });
  const pending = useRef(false),
    panel = useRef(null);
  const close = useRef(null);
  close.current = async () => {
    if (!pending.current && (await mayLeaveDrafts())) onClose();
  };
  const titles = {
    invite: t("Tạo lời mời"),
    remove: t("Loại thành viên"),
    transfer: t("Chuyển quyền sở hữu"),
    leave: t("Rời Workspace"),
    revoke: t("Thu hồi lời mời"),
    retry: t("Thử gửi lại email"),
  };
  const explanation = {
    remove:
      t("Người này sẽ mất quyền truy cập. Task chưa Done bị bỏ assignee, kể cả trong Project Archived; Task Done giữ người cũ. Task và bình luận không bị xóa. Gỡ khỏi nhóm không chặn dùng lại lời mời còn hiệu lực."),
    transfer:
      t("Người này sẽ trở thành Owner; bạn trở thành Member và mất quyền quản lý nhóm/lời mời. Bạn vẫn ở trong nhóm, lời mời còn hiệu lực được giữ."),
    leave:
      t("Bạn sẽ mất quyền truy cập. Task chưa Done bị bỏ assignee; Task Done giữ người cũ. Tùy chọn email riêng được xóa."),
    revoke:
      t("Ngăn gia nhập qua lời mời này về sau; không loại người đã tham gia và không rút email đã gửi."),
    retry: t("Chỉ xếp hàng gửi lại email thất bại; thời hạn lời mời giữ nguyên."),
  };
  useDialogFocus(panel, () => close.current());
  async function submit(e) {
    e.preventDefault();
    if (pending.current || blocked || result || (action.kind === "transfer" && confirmName !== workspace.name)) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const base = `/workspaces/${workspace.id}`,
      item = action.item;
    try {
      let path = base,
        method = "POST",
        body;
      if (action.kind === "invite") {
        path += "/invitations";
        body = { type, ...(type === "EMAIL" ? { email: email.trim() } : {}) };
      }
      if (action.kind === "remove") {
        path += `/members/${item.userId}/remove`;
        body = { expectedVersion: item.version };
      }
      if (action.kind === "transfer") {
        path += "/ownership";
        method = "PATCH";
        body = { expectedVersion: workspace.version, memberId: item.userId };
      }
      if (action.kind === "leave") {
        path += "/leave";
        body = { expectedVersion: workspace.membershipVersion };
      }
      if (["revoke", "retry"].includes(action.kind)) {
        path += `/invitations/${item.id}/${action.kind === "retry" ? "retry-email" : "revoke"}`;
        body = { expectedVersion: item.version };
      }
      const value = await api.request(path, { method, body });
      if (action.kind === "leave") {
        setLeft(true);
        return;
      }
      if (action.kind === "invite") setResult(value);
      else {
        onClose();
      }
    } catch (e) {
      setError(
        e.status
          ? messageFor(e)
          : t("Chưa xác nhận được kết quả. Đóng và làm mới danh sách trước khi thao tác lại."),
      );
      setBlocked(true);
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
        className="dialog workspace-team-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-title"
      >
        <h2 id="team-title">{titles[action.kind]}</h2>
        <p>
          {workspace.name}
          {action.item &&
            ` · ${action.item.displayName ?? action.item.email ?? t("Liên kết tham gia")}`}
        </p>
        {result ? (
          <>
            <InlineMessage tone="info">
              {result.code === "ALREADY_MEMBER"
                ? t("Người này đã ở trong nhóm.")
                : result.url
                  ? t("Đã tạo liên kết. Sao chép trước khi đóng; danh sách không lưu lại URL.")
                  : t("Đã tạo lời mời; email đang chờ gửi.")}
            </InlineMessage>
            {result.url && (
              <>
                <label>
                  {t("Liên kết tham gia")}
                  <textarea
                    aria-label={t("Liên kết tham gia")}
                    readOnly
                    value={result.url}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <p>
                  {t("Hết hạn {date}. Ai có link hợp lệ và tài khoản đã xác minh đều có thể tham gia.", { date: date(result.invitation.expiresAt, locale) })}
                </p>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(result.url);
                      setCopied(t("Đã sao chép."));
                    } catch {
                      setCopied(t("Chọn liên kết để sao chép thủ công."));
                    }
                  }}
                >
                  {t("Sao chép liên kết")}
                </button>
                <InlineMessage tone="info">{t(copied)}</InlineMessage>
              </>
            )}
            <button
              onClick={() => {
                onClose();
              }}
            >
              {t("Đóng kết quả")}
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            {action.kind === "invite" ? (
              <fieldset disabled={busy || blocked || (action.kind === "transfer" && confirmName !== workspace.name)}>
                <label>
                  {t("Cách mời")}
                  <select
                    aria-label={t("Cách mời")}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="EMAIL">{t("Qua email")}</option>
                    <option value="LINK">{t("Qua liên kết")}</option>
                  </select>
                </label>
                {type === "EMAIL" && (
                  <label>
                    {t("Email người nhận")}
                    <input
                      type="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                )}
                <p>
                  {t("Lời mời có hạn 7 ngày. Chỉ tài khoản đã xác minh được gia nhập.")}
                </p>
              </fieldset>
            ) : (
              <p>{explanation[action.kind]}</p>
            )}
            {action.kind === 'transfer' && <label>{t("Nhập tên Workspace để xác nhận")}<input required maxLength={200} value={confirmName} onChange={event => setConfirmName(event.target.value)} placeholder={workspace.name} /></label>}
            {error && <InlineMessage>{t(error)}</InlineMessage>}
            <div className="buttons">
              <button
                type="button"
                disabled={busy}
                onClick={() => close.current()}
              >
                {t("Đóng")}
              </button>
              <button className="primary" disabled={busy || blocked || (action.kind === "transfer" && confirmName !== workspace.name)}>
                {busy ? "Đang xử lý…" : titles[action.kind]}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
}
