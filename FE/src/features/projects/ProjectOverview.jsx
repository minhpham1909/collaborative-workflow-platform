export default function ProjectOverview({ data }) {
  if (!data) return <section className="project-overview" aria-label="Tiến độ toàn Dự án"><span>Tiến độ toàn Dự án hiển thị khi Board tải thành công.</span></section>;
  return <section className="project-overview" aria-label="Tiến độ toàn Dự án"><div><strong>{data.done}/{data.total} Task hoàn thành</strong><span>Toàn Dự án · Không gồm thùng rác</span></div><progress max="100" value={data.progressPercent} aria-label="Tỷ lệ hoàn thành toàn Dự án" /><strong>{data.progressPercent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%</strong><span>{data.overdue} quá hạn</span></section>;
}
