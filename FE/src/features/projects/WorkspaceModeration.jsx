import useLiveRefresh from '../../lib/useLiveRefresh.js';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workspaceText } from '../../lib/workspace-text.js';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InlineMessage, LoadingState, EmptyState } from '../../components/Feedback.jsx';
import FormField from '../../components/FormField.jsx';
import useDialogFocus from '../../components/useDialogFocus.js';
import { confirmDialog, notify } from '../../components/NotificationProvider.jsx';
import { useDraftGuard } from '../../lib/draft-navigation.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import { messageFor } from '../../lib/messages.js';
const date = (value, locale) => new Date(value).toLocaleString(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const choices = { none: 'Giữ bình luận', 1: '1 ngày gần nhất', 3: '3 ngày gần nhất', 7: '7 ngày gần nhất', 30: '30 ngày gần nhất', all: 'Toàn bộ bình luận' };
const states = { pending: 'Chờ xử lý', processing: 'Đang xử lý', completed: 'Đã hoàn tất', failed: 'Xử lý thất bại' };
export function BanDialog({ api, workspace, member, onClose }) {
  return <ModerationDialog api={api} workspace={workspace} target={member} kind="ban" onClose={onClose} />;
}
function ModerationDialog({ api, workspace, target, kind, onClose }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => workspaceText(value, locale, values);
  const [cleanup, setCleanup] = useState('none'), [reason, setReason] = useState(''), [confirmation, setConfirmation] = useState(''), [preview, setPreview] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false);
  const pending = useRef(false), panel = useRef(null), close = useRef(null);
  useDraftGuard({ dirty: Boolean(reason || confirmation || cleanup !== 'none'), busy, message: t("Bỏ xác nhận kiểm soát truy cập chưa gửi?"), busyMessage: t("Đang xử lý yêu cầu. Vui lòng chờ kết quả trước khi rời trang.") });
  close.current = async () => { if (!pending.current && ((!reason && !confirmation && cleanup === 'none') || await confirmDialog(t("Đóng xác nhận kiểm soát truy cập?"), { confirmLabel: t("Đóng") }))) onClose(); };
  useDialogFocus(panel, () => close.current());
  const base = `/moderation/workspace/${workspace.id}`;
  async function run(event, previewOnly = false) {
    event?.preventDefault(); if (pending.current || uncertain) return;
    pending.current = true; setBusy(true); setError('');
    try {
      if (previewOnly) { setPreview(await api.request(base + '/preview', { method: 'POST', body: { userId: target.userId, cleanup } })); return; }
      await api.request(kind === 'ban' ? base + '/bans' : base + `/bans/${target.userId}/unban`, { method: 'POST', body: kind === 'ban' ? { userId: target.userId, cleanup, reason: reason.trim(), expectedVersion: preview.expectedVersion, ...(cleanup !== 'none' ? { preview: preview.preview } : {}) } : { reason: reason.trim(), expectedVersion: target.version } });
      notify(kind === 'ban' ? t("Đã chặn truy cập. Bình luận cần dọn được xếp hàng xử lý.") : t("Đã bỏ chặn. Người này chưa được cấp lại quyền tham gia.")); onClose();
    } catch (error) { const unknownWrite = !previewOnly && isUncertainMutation(error); setUncertain(unknownWrite); setError(unknownWrite ? t("Chưa xác nhận kết quả. Đóng và tải lại trước khi thao tác tiếp.") : messageFor(error)); if (kind === 'ban') setPreview(null); }
    finally { pending.current = false; setBusy(false); }
  }
  const validReason = reason.trim() && !/[\u0000-\u001f\u007f\u2028\u2029]/u.test(reason);
  return createPortal(<div className="overlay"><section ref={panel} tabIndex={-1} lang={locale} className="dialog moderation-dialog" role="dialog" aria-modal="true" aria-labelledby="moderation-title"><h2 id="moderation-title">{kind === 'ban' ? t("Chặn truy cập Workspace") : t("Bỏ chặn truy cập")}</h2><p><strong>{target.displayName ?? target.userId}</strong> · {workspace.name}</p><form onSubmit={event => run(event)}><fieldset disabled={busy || uncertain}>
    <p>{kind === 'ban' ? t("Thu hồi quyền trong Workspace này và chặn dùng lại lời mời còn hiệu lực. Task chưa Done bỏ assignee; Task Done và lịch sử được giữ. Không ảnh hưởng Workspace khác.") : t("Bỏ chặn không tự khôi phục membership, Task assignee hoặc quyền Project. Cần thêm/mời lại theo quyền hiện tại. Bỏ chặn không hủy công việc dọn bình luận đã xếp hàng.")}</p>
    {kind === 'ban' && <FormField label={t("Bình luận cần dọn")} hint={t("Chỉ bình luận của người này trong Workspace, kể cả Project lưu trữ. Task và tài liệu được giữ.")}>{props => <select {...props} value={cleanup} onChange={event => { setCleanup(event.target.value); setPreview(null); setConfirmation(''); }}>{Object.entries(choices).map(([key,label]) => <option key={key} value={key}>{t(label)}</option>)}</select>}</FormField>}
    <FormField label={t("Lý do")} hint={t("Một dòng, tối đa 2.000 ký tự; ghi vào nhật ký.")}>{props => <input {...props} required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} />}</FormField>
    {kind === 'ban' && <><button type="button" onClick={() => run(null, true)}>{t("Xem trước tác động")}</button>{preview && <InlineMessage tone="info">{t("{count} bình luận thuộc phạm vi đã chọn. Mốc chốt: {date}. Số xử lý thực tế được cập nhật ở nhật ký.", { count: preview.matchedCount, date: date(preview.cutoff, locale) })}</InlineMessage>}{cleanup !== 'none' && <><p>{t("Bình luận đã dọn sẽ bị xóa vĩnh viễn, không vào thùng rác.")}</p><FormField label={t("Xác nhận dọn bình luận")} hint={t("Nhập XÓA BÌNH LUẬN để xác nhận.")}>{props => <input {...props} value={confirmation} onChange={event => setConfirmation(event.target.value)} />}</FormField></>}</>}
    </fieldset>{error && <InlineMessage>{t(error)}</InlineMessage>}<div className="buttons"><button type="button" disabled={busy} onClick={() => close.current()}>{t("Đóng")}</button><button className="primary" disabled={busy || uncertain || !validReason || (kind === 'ban' && (!preview || (cleanup !== 'none' && confirmation !== 'XÓA BÌNH LUẬN')))}>{busy ? t("Đang xử lý…") : kind === 'ban' ? t("Chặn truy cập") : t("Bỏ chặn")}</button></div></form></section></div>, document.body);
}
export default function WorkspaceModeration({ api, workspace }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => workspaceText(value, locale, values);
  const [tab, setTab] = useState('bans'), [data, setData] = useState({ items: [] }), [busy, setBusy] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0), [target, setTarget] = useState(null), [retrying, setRetrying] = useState(false), [uncertain, setUncertain] = useState(false), generation = useRef(0), pending = useRef(false);
  useLiveRefresh(() => setRevision(value => value + 1));
  const base = `/moderation/workspace/${workspace.id}`;
  async function load(cursor, token = generation.current) { setBusy(true); setError(''); try { const result = await api.request(`${base}/${tab}?limit=12${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`); if (token === generation.current) { setData(old => ({ ...result, items: cursor ? [...old.items, ...result.items] : result.items })); setUncertain(false); } } catch (error) { if (token === generation.current) { setError(messageFor(error)); setData({ items: [] }); } } finally { if (token === generation.current) setBusy(false); } }
  useEffect(() => { const token = ++generation.current; setData({ items: [] }); load(null, token); return () => { generation.current++; }; }, [workspace.id, workspace.version, tab, revision]);
  async function retry(item) { if (pending.current || uncertain || !await confirmDialog(t("Xếp hàng xử lý lại phần bình luận còn lại? Giữ nguyên người, phạm vi và mốc thời gian của lần Ban."), { confirmLabel: t("Xếp hàng lại") })) return; pending.current = true; setRetrying(true); try { await api.request(`${base}/actions/${item.id}/retry`, { method: 'POST', body: { expectedVersion: item.version } }); notify(t("Đã xếp hàng xử lý lại.")); setRevision(v => v + 1); } catch (error) { setUncertain(isUncertainMutation(error)); setError(isUncertainMutation(error) ? t("Chưa xác nhận kết quả. Tải lại trước khi tiếp tục.") : messageFor(error)); } finally { pending.current = false; setRetrying(false); } }
  return <section lang={locale} className="workspace-moderation"><h2>{t("An toàn truy cập")}</h2><p>{t("Chặn theo Workspace. Bỏ chặn không tự cấp lại quyền; việc dọn bình luận được xử lý nền và có nhật ký.")}</p><div className="team-tabs"><button aria-pressed={tab === 'bans'} onClick={() => setTab('bans')} disabled={retrying}>{t("Danh sách chặn")}</button><button aria-pressed={tab === 'actions'} onClick={() => setTab('actions')} disabled={retrying}>{t("Nhật ký xử lý")}</button></div>{error && <InlineMessage>{t(error)}</InlineMessage>}{busy && <LoadingState>{t("Đang tải trạng thái kiểm soát truy cập…")}</LoadingState>}<ul className="audit-list">{data.items.map(item => <li key={item.id}><strong>{item.displayName ?? item.targetDisplayName ?? item.userId ?? item.targetUserId}</strong>{tab === 'bans' ? <><p>{item.state === 'active' ? t("Đang chặn") : t("Đã bỏ chặn")} · {item.reason}</p><time>{date(item.imposedAt, locale)}</time>{item.state === 'active' && <button disabled={busy || retrying || uncertain} onClick={() => setTarget(item)}>{t("Bỏ chặn")}</button>}</> : <><p>{item.action === 'ban' ? t("Chặn truy cập") : item.action === 'unban' ? t("Bỏ chặn") : t("Xóa bình luận")} · {t(states[item.state])}</p><p>{item.reason}</p><p>{t("{done}/{total} bình luận đã xử lý · {choice} · Mốc {date}", { done: item.deletedCount, total: item.matchedCount, choice: t(choices[item.cleanup]), date: date(item.cutoff, locale) })}</p>{item.lastErrorCode && <InlineMessage>{t("Đợt dọn bình luận gặp lỗi. Có thể xếp hàng lại để xử lý phần còn lại.")}</InlineMessage>}{item.state === 'failed' && item.action === 'ban' && item.cleanup !== 'none' && <button disabled={busy || retrying || uncertain} onClick={() => retry(item)}>{t("Xếp hàng xử lý lại")}</button>}</>}</li>)}</ul>{!busy && !error && !data.items.length && <EmptyState>{t("Chưa có dữ liệu trong danh sách này.")}</EmptyState>}{data.nextCursor && <button disabled={busy || retrying} onClick={() => load(data.nextCursor)}>{t("Tải thêm")}</button>}{target && <ModerationDialog api={api} workspace={workspace} target={target} kind="unban" onClose={() => { setTarget(null); setRevision(v => v + 1); }} />}</section>;
}
