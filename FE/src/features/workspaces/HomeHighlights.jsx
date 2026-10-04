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
        api.request("/my-tasks?limit=1&status=open&state=active&overdue=true"),
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
  return (
    <p className="home-day">
      {new Date(`${data.day}T00:00:00+07:00`).toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        weekday: "long",
        day: "numeric",
        month: "long",
      })}
      {data.today && (
        <>
          {" "}
          · Bạn có <a href="#mine">{data.today.total} việc đến hạn hôm nay</a>
          {data.today.total > 0 &&
            ` tại ${data.today.workspaceCount} Workspace`}
          .
        </>
      )}
      {data.today === null && (
        <span> · Chưa tải được tổng quan công việc.</span>
      )}
    </p>
  );
}
export default function HomeHighlights({ data }) {
  const note = data.inbox?.items?.[0];
  return (
    <section className="home-highlights" aria-label="Tổng quan cá nhân hôm nay">
      <article className="highlight-card">
        <div className="highlight-heading">
          <span className="highlight-icon">
            <Icon name="tasks" />
          </span>
          <div>
            <h2>
              Nhiệm vụ ưu tiên trong ngày{" "}
              {data.today && (
                <span className="count-pill">{data.today.total} việc</span>
              )}
            </h2>
            <p>
              Task được giao cho bạn, chưa xong và đến hạn hôm nay · Giờ Việt
              Nam.
            </p>
          </div>
          <a className="pill-link" href="#mine">
            Xem công việc →
          </a>
        </div>
        {data.today === undefined ? (
          <LoadingState>Đang tải công việc…</LoadingState>
        ) : data.today === null ? (
          <InlineMessage>
            Chưa tải được công việc. Mở Công việc của tôi để thử lại.
          </InlineMessage>
        ) : data.today.total === 0 ? (
          <p className="highlight-empty">
            Hôm nay bạn không có Task đến hạn. Một chút không gian cho ý tưởng
            mới ✨
          </p>
        ) : (
          <ul className="priority-tasks">
            {data.today.items.map((task) => (
              <li key={task.id}>
                <a href={`#task/${task.id}`}>{task.title}</a>
                <span>
                  {task.workspaceName} ·{" "}
                  {new Date(task.dueAt).toLocaleTimeString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        {data.overdue && data.overdue.total > 0 && (
          <p className="overdue-hint">
            Cần chú ý:{" "}
            <a href="#mine">{data.overdue.total} Task đang quá hạn</a>.
          </p>
        )}
      </article>
      <article className="highlight-card notification-highlight">
        <div className="highlight-heading">
          <span className="highlight-icon">
            <Icon name="bell" />
          </span>
          <div>
            <h2>
              Thông báo mới{" "}
              {data.inbox && (
                <span className="count-pill coral-pill">
                  {data.inbox.unreadCount}
                </span>
              )}
            </h2>
            <p>Cập nhật từ những nhóm bạn tham gia.</p>
          </div>
        </div>
        {data.inbox === undefined ? (
          <LoadingState>Đang tải thông báo…</LoadingState>
        ) : data.inbox === null ? (
          <InlineMessage>
            Chưa tải được thông báo. Mở danh sách thông báo để thử lại.
          </InlineMessage>
        ) : note ? (
          <a className="latest-notification" href={`#notification/${note.id}`}>
            <strong>
              {note.available
                ? (note.payload?.taskTitle ??
                  `Lời mời tham gia ${note.payload?.workspaceName}`)
                : "Nội dung không còn khả dụng"}
            </strong>
            <span>
              {new Date(note.createdAt).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "numeric",
              })}
            </span>
          </a>
        ) : (
          <p>Bạn đã xem hết thông báo.</p>
        )}
        <a className="highlight-more" href="#notifications">
          Xem tất cả thông báo →
        </a>
      </article>
    </section>
  );
}
