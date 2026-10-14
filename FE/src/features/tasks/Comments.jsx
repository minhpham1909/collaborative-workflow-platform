import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { taskText } from '../../lib/task-text.js';
import {
  EmptyState,
  InlineMessage,
  LoadingState,
} from "../../components/Feedback.jsx";
import { useDraftGuard } from "../../lib/draft-navigation.js";
import {
  confirmDialog,
  notify,
} from "../../components/NotificationProvider.jsx";
import PersonProfile from "../../components/PersonProfile.jsx";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
import { useEffect, useRef, useState } from "react";
import RichEditor from "../../components/RichEditor.jsx";
import { messageFor } from "../../lib/messages.js";
import { validateContent } from "../../lib/content.js";
function Composer({ api, taskId, comment, onDone, onCancel, disabled = false }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => taskText(value, locale, values);
  const [content, setContent] = useState(comment?.content),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const pending = useRef(false);
  useDraftGuard({
    dirty: dirty,
    busy: busy,
    message: tr("Bỏ nội dung bình luận chưa lưu?"),
  });

  async function save(e) {
    e.preventDefault();
    if (pending.current || uncertain) return;
    const invalid = validateContent(content, 5000, true);
    if (invalid) {
      setError(invalid);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await api.request(
        `/tasks/${taskId}/comments` + (comment ? `/${comment.id}` : ""),
        {
          method: comment ? "PATCH" : "POST",
          body: {
            content,
            ...(comment ? { expectedVersion: comment.version } : {}),
          },
        },
      );
      setDirty(false);
      notify(tr("Đã lưu bình luận."));
      onDone();
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : tr("Chưa rõ bình luận đã lưu chưa. Tải lại danh sách trước khi gửi lại."),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="comment-form" onSubmit={save}>
      <RichEditor
              locale={locale}
        value={content}
        onChange={(v) => {
          setContent(v);
          setDirty(true);
        }}
        readOnly={busy}
        label={comment ? tr("Sửa bình luận") : tr("Bình luận mới")}
        limit={5000}
      />
      {error && <InlineMessage>{tr(error)}</InlineMessage>}
      <div className="buttons">
        <button disabled={busy || uncertain} className="primary">
          {busy ? tr("Đang lưu…") : comment ? tr("Lưu bình luận") : tr("Gửi bình luận")}
        </button>
        <button
          type="button"
          disabled={busy || disabled}
          onClick={async () => {
            if (
              !dirty ||
              (await confirmDialog(
                uncertain
                  ? tr("Đóng form và tải lại để kiểm tra bình luận đã lưu chưa?")
                  : tr("Bỏ bình luận chưa lưu?"),
              ))
            )
              onCancel(uncertain);
          }}
        >{tr("Hủy bình luận")}</button>
      </div>
    </form>
  );
}
export default function Comments({ api, taskId, projectId, readOnly, disabled = false, onComposing }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => taskText(value, locale, values);
  const [data, setData] = useState({ items: [] }),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(null),
    [writing, setWriting] = useState(false),
    [revision, setRevision] = useState(0);
  const generation = useRef(0),
    pending = useRef(false);
  useDraftGuard({ dirty: false, busy: busy && pending.current, message: tr("Bình luận đang xử lý.") });
  useEffect(() => {
    onComposing?.(Boolean(writing || editing));
    return () => onComposing?.(false);
  }, [writing, editing, onComposing]);
  async function load(cursor, token = generation.current) {
    setBusy(true);
    setError("");
    try {
      const result = await api.request(
        `/tasks/${taskId}/comments?limit=12` +
          (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      if (token === generation.current)
        setData((old) => ({
          ...result,
          items: cursor ? [...old.items, ...result.items] : result.items,
        }));
    } catch (e) {
      if (token === generation.current) {
        setData({ items: [] });
        setEditing(null);
        setWriting(false);
        setError(messageFor(e));
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    const token = ++generation.current;
    load(null, token);
    return () => {
      generation.current++;
    };
  }, [taskId, revision]);
  async function remove(c) {
    if (pending.current) return;
    if (
      pending.current ||
      !(await confirmDialog(
        tr("Xóa hẳn bình luận? Không thể phục hồi nội dung sau khi xóa."),
        {
          title: tr("Xóa bình luận?"),
          confirmLabel: tr("Xóa bình luận"),
          tone: "danger",
        },
      ))
    )
      return;
    pending.current = true;
    setBusy(true);
    try {
      await api.request(`/tasks/${taskId}/comments/${c.id}/delete`, {
        method: "POST",
        body: { expectedVersion: c.version },
      });
      setRevision((v) => v + 1);
    } catch (e) {
      setError(messageFor(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="project-info comments">
      <div className="section-title">
        <h2>{tr("Thảo luận")} {data.total !== undefined && `(${data.total})`}</h2>
        <div className="buttons">
          {!writing && !editing && (
            <button disabled={busy || disabled} onClick={() => setRevision((v) => v + 1)}>{tr("Tải lại bình luận")}</button>
          )}
          {!readOnly && !writing && !editing && (
            <button disabled={busy || disabled} onClick={() => setWriting(true)}>{tr("+ Viết bình luận")}</button>
          )}
        </div>
      </div>
      <p className="muted">{tr("Bình luận mới nhất trước")}</p>
      {error && <InlineMessage>{tr(error)}</InlineMessage>}

      {busy && <LoadingState>{tr("Đang tải bình luận…")}</LoadingState>}
      {writing && !readOnly && (
        <Composer
          api={api}
          taskId={taskId}
          onCancel={(uncertain) => {
            setWriting(false);
            if (uncertain) setRevision((v) => v + 1);
          }}
          onDone={() => {
            setWriting(false);
            setRevision((v) => v + 1);
          }}
        />
      )}
      {data.items.map((c) => (
        <article className="comment" key={c.id}>
          <div className="section-title">
            <strong className="comment-author">
              {c.author && projectId ? <PersonProfile locale={locale} api={api} projectId={projectId} user={c.author} /> : (c.author?.displayName ?? tr("Người dùng không còn khả dụng"))}
            </strong>
            <span className="muted">
              {new Date(c.createdAt).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </span>
          </div>
          {editing === c.id && !readOnly ? (
            <Composer
              api={api}
              taskId={taskId}
              comment={c}
              onCancel={(uncertain) => {
                setEditing(null);
                if (uncertain) setRevision((v) => v + 1);
              }}
              onDone={() => {
                setEditing(null);
                setRevision((v) => v + 1);
              }}
            />
          ) : (
            <RichEditor
              locale={locale}
              value={c.content}
              readOnly
              label={tr("Bình luận của {name}", { name: c.author?.displayName ?? tr("Người dùng không còn khả dụng") })}
            />
          )}{" "}
          {!writing && !editing && (
            <div className="buttons">
              {!readOnly && c.permissions.edit && (
                <button disabled={busy || disabled} onClick={() => setEditing(c.id)}>{tr("Sửa bình luận")}</button>
              )}
              {!readOnly && c.permissions.delete && (
                <button disabled={busy || disabled} onClick={() => remove(c)}>{tr("Xóa bình luận")}</button>
              )}
            </div>
          )}
        </article>
      ))}
      {!busy && !data.items.length && !error && (
        <EmptyState>{tr("Chưa có bình luận.")}</EmptyState>
      )}
      {data.nextCursor && !editing && !writing && (
        <button disabled={busy || disabled} onClick={() => load(data.nextCursor)}>{tr("Tải thêm bình luận")}</button>
      )}
    </section>
  );
}
