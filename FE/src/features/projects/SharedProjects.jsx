import useLiveRefresh from '../../lib/useLiveRefresh.js';
import CollectionView,{useCollectionView} from '../../components/CollectionView.jsx';
import {ProjectPinButton} from '../../components/ProjectPins.jsx';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { projectText } from '../../lib/project-text.js';
import { useEffect, useRef, useState } from "react";
import { EmptyState, InlineMessage, LoadingState } from "../../components/Feedback.jsx";
import FilterPanel from "../../components/FilterPanel.jsx";
import Icon from "../../components/Icon.jsx";
import { messageFor } from "../../lib/messages.js";

export default function SharedProjects({ api, userId }) {
  const { locale } = useAuthLocale();
  const [view,setView]=useCollectionView(userId,'shared-projects',['grid','list'],'grid');
  const tr = (value, values) => projectText(value, locale, values);
  const [q, setQ] = useState(""), [state, setState] = useState("active"), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [data, setData] = useState(null), [busy, setBusy] = useState(true), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  useLiveRefresh(() => setRevision(value => value + 1));
  const sequence = useRef(0), invalid = Boolean(from && to && from > to);
  const query = new URLSearchParams({ limit: "12", state, ...(q.trim() ? { q: q.trim() } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
  async function load(cursor = null, token = sequence.current) {
    setBusy(true); setError("");
    try {
      const params = new URLSearchParams(query); if (cursor) params.set("cursor", cursor);
      const result = await api.request(`/shared-projects?${params}`);
      if (token === sequence.current) setData(old => cursor && old ? { ...result, items: [...old.items, ...result.items].filter((item, index, all) => all.findIndex(value => value.id === item.id) === index) } : result);
    } catch (e) {
      if (token === sequence.current) { if (!cursor) setData(null); setError(messageFor(e)); }
    } finally { if (token === sequence.current) setBusy(false); }
  }
  useEffect(() => {
    const token = ++sequence.current; setData(null);
    if (invalid) { setBusy(false); return; }
    const timer = setTimeout(() => load(null, token), 300);
    return () => { clearTimeout(timer); sequence.current++; };
  }, [query, revision]);
  return (
    <main className="studio-project-page">
      <section className="hero">
        <div><small>{tr("CỘNG TÁC THEO PHẠM VI")}</small><h1>{tr("Dự án được chia sẻ")}</h1><p>{tr("Project bạn đã chấp nhận quyền Guest. Bạn được xem và bình luận theo quyền hiện tại.")}</p></div>

      </section>
      <CollectionView kind="layout" view={view} onChange={setView} locale={locale}/>
      <FilterPanel locale={locale} compact advancedLabel={tr("Bộ lọc")}>
        <label>{tr("Tìm Dự án được chia sẻ")}<input type="search" maxLength={200} value={q} onChange={e => setQ(e.target.value)} /></label>
        <label>{tr("Trạng thái Dự án")}<select aria-label={tr("Trạng thái Dự án")} value={state} onChange={e => setState(e.target.value)}><option value="active">{tr("Đang hoạt động")}</option><option value="archived">{tr("Đã lưu trữ")}</option><option value="all">{tr("Tất cả")}</option></select></label>
        <label>{tr("Từ ngày tạo")}<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>{tr("Đến ngày tạo")}<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <button onClick={() => { setQ(""); setState("active"); setFrom(""); setTo(""); }}>{tr("Xóa bộ lọc")}</button>
      </FilterPanel>
      {invalid && <InlineMessage>{tr("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")}</InlineMessage>}
      {busy && <LoadingState>{tr("Đang tải Project được chia sẻ…")}</LoadingState>}
      {error && <InlineMessage>{tr(error)} <button disabled={busy} onClick={() => load()}>{tr("Thử lại")}</button></InlineMessage>}
      {data && !data.items.length && <EmptyState>{tr("Không có Project được chia sẻ phù hợp. Kiểm tra lời mời trong Thông báo hoặc thay đổi bộ lọc.")}</EmptyState>}
      {data && <div className={'cards project-cards collection-'+view} aria-busy={busy}>{data.items.map(project => (
        <article className="card" key={project.id}>
          <span className={`badge state-${project.state}`}>{project.state === "archived" ? tr("Đã lưu trữ · Chỉ đọc") : tr("Đang hoạt động")}</span>
          <h2><a className="surface-link" href={`#project/${project.id}`}><Icon name={project.icon ?? "folder"} /> {project.name}</a></h2>
          <p>{project.context?.workspaceName}</p><p>{project.description?.plainText || tr("Project chưa có mô tả.")}</p>
          <ProjectPinButton projectId={project.id}/>
          <p>{project.accessRole === "guest" ? tr("Guest · Xem và bình luận") : tr("Bạn có thêm quyền từ membership hiện tại.")}</p>
        </article>
      ))}</div>}
      {data?.nextCursor && <button disabled={busy} onClick={() => load(data.nextCursor)}>{tr("Tải thêm Dự án")}</button>}
    </main>
  );
}
