import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { homeText } from '../../lib/home-text.js';
import { InlineMessage, LoadingState } from "../../components/Feedback.jsx";
import { useEffect, useState } from "react";
import Icon from "../../components/Icon.jsx";
function vietnamDay() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((value) => value.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function useHomeHighlights(api, revision = 0) {
  const [day, setDay] = useState(vietnamDay),
    [data, setData] = useState({});
  useEffect(() => {
    const timer = setInterval(() => setDay(vietnamDay()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let live = true,
      sequence = 0;
    async function load() {
      const token = ++sequence;
      const results = await Promise.allSettled([
        api.request(
          `/my-tasks?limit=3&status=open&state=active&timeField=dueAt&from=${day}&to=${day}`,
        ),
        api.request("/my-tasks?limit=3&status=open&state=active&overdue=true"),
        api.request("/notifications?limit=1&read=unread"),
      ]);
      if (live && token === sequence)
        setData(
          Object.fromEntries(
            ["today", "overdue", "inbox"].map((key, index) => [
              key,
              results[index].status === "fulfilled"
                ? results[index].value
                : null,
            ]),
          ),
        );
    }
    setData({});
    load();
    window.addEventListener("focus", load);
    window.addEventListener("workflow-inbox-changed", load);
    return () => {
      live = false;
      window.removeEventListener("focus", load);
      window.removeEventListener("workflow-inbox-changed", load);
    };
  }, [api, day, revision]);
  return { ...data, day };
}
export function HomeDay({ data }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => homeText(value, locale, values);
  return (
    <p className="home-day">
      {new Date(`${data.day}T00:00:00+07:00`).toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        weekday: "long",
        day: "numeric",
        month: "long",
      })}
      {data.today && (
        <>
          {" "}
          · {t("Bạn có")} <a href="#mine">{t("{count} việc đến hạn hôm nay", { count: data.today.total })}</a>
          {data.today.total > 0 &&
            ` ${t("tại {count} Workspace", { count: data.today.workspaceCount })}`}
          .
        </>
      )}
      {data.today === null && (
        <span> · {t("Chưa tải được tổng quan công việc.")}</span>
      )}
    </p>
  );
}
export default function HomeHighlights({ data, compact = false }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => homeText(value, locale, values);
  const note = data.inbox?.items?.[0];
  if (compact) return <section className="home-overview" aria-label={t("Tổng quan cá nhân hôm nay")}>
    {[['calendar', 'Đến hạn hôm nay', data.today?.total, 'Công việc chưa hoàn thành', 'lavender'], ['tasks', 'Đang quá hạn', data.overdue?.total, 'Cần kiểm tra và xử lý', 'coral'], ['bell', 'Thông báo chưa đọc', data.inbox?.unreadCount, 'Cập nhật từ nhóm của bạn', 'mint']].map(([icon, label, count, hint, tone]) => <a className={`home-overview-card accent-${tone}`} href={icon === 'bell' ? '#notifications' : '#mine'} key={label}><div><span>{t(label)}</span><strong>{count ?? '—'}</strong><small>{t(hint)}</small></div><span className="home-overview-icon"><Icon name={icon} /></span></a>)}
  </section>;
  const seen = new Set();
  const tasks = [...(data.overdue?.items ?? []), ...(data.today?.items ?? [])].filter(task => { if (seen.has(task.id)) return false; seen.add(task.id); return true; });
  return <section className="home-highlights home-attention">
    <article className="highlight-card"><div className="highlight-heading"><span className="highlight-icon"><Icon name="tasks" /></span><div><h2>{t("Việc cần chú ý")}</h2><p>{t("Quá hạn hoặc đến hạn hôm nay · Được giao cho bạn")}</p></div><a className="home-text-link" href="#mine">{t("Xem công việc →")}</a></div>
      {data.today === undefined || data.overdue === undefined ? <LoadingState>{t("Đang tải công việc…")}</LoadingState> : <>
        {(data.today === null || data.overdue === null) && <InlineMessage>{t("Chưa tải được một phần công việc.")} <a href="#mine">{t("Mở Công việc của tôi để thử lại.")}</a></InlineMessage>}
        {tasks.length ? <ul className="priority-tasks">{tasks.map(task => <li key={task.id}><div><small>{task.code ?? t('Công việc')} · {task.projectName}</small><a href={`#task/${task.id}`}>{task.title}</a><span>{task.workspaceName}</span></div><span className={task.overdue ? 'attention-deadline overdue' : 'attention-deadline'}>{t(task.overdue ? 'Quá hạn' : 'Hôm nay')} · {new Date(task.dueAt).toLocaleTimeString(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}</span></li>)}</ul> : data.today && data.overdue && <p className="highlight-empty">{t("Bạn không có công việc quá hạn hoặc đến hạn hôm nay.")}</p>}
      </>}
    </article>
    <article className="highlight-card notification-highlight"><div className="highlight-heading"><span className="highlight-icon"><Icon name="bell" /></span><div><h2>{t("Thông báo mới")}</h2><p>{t("Những cập nhật cần bạn xem.")}</p></div></div>
      {data.inbox === undefined ? <LoadingState>{t("Đang tải thông báo…")}</LoadingState> : data.inbox === null ? <InlineMessage>{t("Chưa tải được thông báo.")} <a href="#notifications">{t("Thử lại trong danh sách thông báo.")}</a></InlineMessage> : note ? <a className="latest-notification" href={`#notification/${note.id}`}><strong>{note.available ? note.payload?.taskTitle ?? t('Lời mời tham gia {name}', { name: note.payload?.workspaceName ?? note.payload?.organizationName ?? note.payload?.projectName ?? (locale === 'en' ? 'workspace' : 'không gian làm việc') }) : t('Nội dung không còn khả dụng')}</strong><span>{new Date(note.createdAt).toLocaleString(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></a> : <p className="highlight-empty">{t("Bạn đã xem hết thông báo.")}</p>}
      <a className="home-text-link" href="#notifications">{t("Xem tất cả thông báo →")}</a>
    </article>
  </section>;
}
