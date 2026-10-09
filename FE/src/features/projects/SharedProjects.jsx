import { useEffect, useRef, useState } from "react";
import { EmptyState, InlineMessage, LoadingState } from "../../components/Feedback.jsx";
import FilterPanel from "../../components/FilterPanel.jsx";
import Icon from "../../components/Icon.jsx";
import { messageFor } from "../../lib/messages.js";

export default function SharedProjects({ api }) {
  const [q, setQ] = useState(""), [state, setState] = useState("active"), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [data, setData] = useState(null), [busy, setBusy] = useState(true), [error, setError] = useState(""), [revision, setRevision] = useState(0);
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
        <div><small>CỘNG TÁC THEO PHẠM VI</small><h1>Dự án được chia sẻ</h1><p>Project bạn đã chấp nhận quyền Guest. Bạn được xem và bình luận theo quyền hiện tại.</p></div>
        <button disabled={busy} onClick={() => setRevision(value => value + 1)}>Làm mới danh sách</button>
      </section>
      <FilterPanel compact>
        <label>Tìm Dự án được chia sẻ<input type="search" maxLength={200} value={q} onChange={e => setQ(e.target.value)} /></label>
        <label>Trạng thái Dự án<select aria-label="Trạng thái Dự án" value={state} onChange={e => setState(e.target.value)}><option value="active">Đang hoạt động</option><option value="archived">Đã lưu trữ</option><option value="all">Tất cả</option></select></label>
        <label>Từ ngày tạo<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>Đến ngày tạo<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <button onClick={() => { setQ(""); setState("active"); setFrom(""); setTo(""); }}>Xóa bộ lọc</button>
      </FilterPanel>
      {invalid && <InlineMessage>Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</InlineMessage>}
      {busy && <LoadingState>Đang tải Project được chia sẻ…</LoadingState>}
      {error && <InlineMessage>{error} <button disabled={busy} onClick={() => load()}>Thử lại</button></InlineMessage>}
      {data && !data.items.length && <EmptyState>Không có Project được chia sẻ phù hợp. Kiểm tra lời mời trong Thông báo hoặc thay đổi bộ lọc.</EmptyState>}
      {data && <div className="cards project-cards" aria-busy={busy}>{data.items.map(project => (
        <article className="card" key={project.id}>
          <span className={`badge state-${project.state}`}>{project.state === "archived" ? "Đã lưu trữ · Chỉ đọc" : "Đang hoạt động"}</span>
          <h2><a className="surface-link" href={`#project/${project.id}`}><Icon name={project.icon ?? "folder"} /> {project.name}</a></h2>
          <p>{project.context?.workspaceName}</p><p>{project.description?.plainText || "Project chưa có mô tả."}</p>
          <p>{project.accessRole === "guest" ? "Guest · Xem và bình luận" : "Bạn có thêm quyền từ membership hiện tại."}</p>
        </article>
      ))}</div>}
      {data?.nextCursor && <button disabled={busy} onClick={() => load(data.nextCursor)}>Tải thêm Dự án</button>}
    </main>
  );
}
