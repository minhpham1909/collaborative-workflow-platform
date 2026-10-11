import { projectText } from '../../lib/project-text.js';
export default function ProjectOverview({ data, locale = 'vi' }) {
  const t = (value, values) => projectText(value, locale, values);
  if (!data) return <section className="project-overview" aria-label={t("Tiến độ toàn Dự án")}><span>{t("Tiến độ toàn Dự án hiển thị khi Board tải thành công.")}</span></section>;
  return <section className="project-overview" aria-label={t("Tiến độ toàn Dự án")}><div><strong>{t("{done}/{total} Task hoàn thành", { done: data.done, total: data.total })}</strong><span>{t("Toàn Dự án · Không gồm thùng rác")}</span></div><progress max="100" value={data.progressPercent} aria-label={t("Tỷ lệ hoàn thành toàn Dự án")} /><strong>{data.progressPercent.toLocaleString(locale === 'en' ? 'en-GB' : 'vi-VN', { maximumFractionDigits: 2 })}%</strong><span>{t("{count} quá hạn", { count: data.overdue })}</span></section>;
}
