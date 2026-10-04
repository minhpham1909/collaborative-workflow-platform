import { useDraftGuard } from "../../lib/draft-navigation.js";
import {
  confirmDialog,
  notify,
} from "../../components/NotificationProvider.jsx";
import Avatar from "../../components/Avatar.jsx";
import { isUncertainMutation } from "../../lib/mutation-outcome.js";
import { useEffect, useRef, useState } from "react";
import RichEditor from "../../components/RichEditor.jsx";
import { messageFor } from "../../lib/messages.js";
import { validateContent } from "../../lib/content.js";
function Composer({ api, taskId, comment, onDone, onCancel }) {
  const [content, setContent] = useState(comment?.content),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const pending = useRef(false);
  useDraftGuard({
    dirty: dirty,
    busy: busy,
    message: "Bỏ nội dung bình luận chưa lưu?",
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
      notify("Đã lưu bình luận.");
      onDone();
    } catch (e) {
      setUncertain(isUncertainMutation(e));
      setError(
        !isUncertainMutation(e)
          ? messageFor(e)
          : "Chưa rõ bình luận đã lưu chưa. Tải lại danh sách trước khi gửi lại.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="comment-form" onSubmit={save}>
      <RichEditor
        value={content}
        onChange={(v) => {
          setContent(v);
          setDirty(true);
        }}
        readOnly={busy}
        label={comment ? "Sửa bình luận" : "Bình luận mới"}
        limit={5000}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="buttons">
        <button disabled={busy || uncertain} className="primary">
          {busy ? "Đang lưu…" : comment ? "Lưu bình luận" : "Gửi bình luận"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (
              !dirty ||
              (await confirmDialog(
                uncertain
                  ? "Đóng form và tải lại để kiểm tra bình luận đã lưu chưa?"
                  : "Bỏ bình luận chưa lưu?",
              ))
            )
              onCancel(uncertain);
          }}
        >
          Hủy bình luận
        </button>
      </div>
    </form>
  );
}
export default function Comments({ api, taskId, readOnly, onComposing }) {
  const [data, setData] = useState({ items: [] }),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(null),
    [writing, setWriting] = useState(false),
    [revision, setRevision] = useState(0);
  const generation = useRef(0),
    pending = useRef(false);
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
    if (
      pending.current ||
      !(await confirmDialog(
        "Bình luận sẽ không còn hiển thị trong cuộc thảo luận.",
        {
          title: "Xóa bình luận?",
          confirmLabel: "Xóa bình luận",
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
        <h2>Thảo luận {data.total !== undefined && `(${data.total})`}</h2>
        <div className="buttons">
          {!writing && !editing && (
            <button disabled={busy} onClick={() => setRevision((v) => v + 1)}>
              Tải lại bình luận
            </button>
          )}
          {!readOnly && !writing && !editing && (
            <button disabled={busy} onClick={() => setWriting(true)}>
              + Viết bình luận
            </button>
          )}
        </div>
      </div>
      <p className="muted">Bình luận mới nhất trước</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {busy && <p role="status">Đang tải bình luận…</p>}
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
              {c.author && <Avatar user={c.author} />}
              {c.author?.displayName ?? "Người dùng không còn khả dụng"}
            </strong>
            <span className="muted">
              {new Date(c.createdAt).toLocaleString("vi-VN", {
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
              value={c.content}
              readOnly
              label={"Bình luận của " + c.author?.displayName}
            />
          )}{" "}
          {!readOnly && !writing && !editing && (
            <div className="buttons">
              {c.permissions.edit && (
                <button disabled={busy} onClick={() => setEditing(c.id)}>
                  Sửa bình luận
                </button>
              )}
              {c.permissions.delete && (
                <button disabled={busy} onClick={() => remove(c)}>
                  Xóa bình luận
                </button>
              )}
            </div>
          )}
        </article>
      ))}
      {!busy && !data.items.length && !error && <p>Chưa có bình luận.</p>}
      {data.nextCursor && !editing && !writing && (
        <button disabled={busy} onClick={() => load(data.nextCursor)}>
          Tải thêm bình luận
        </button>
      )}
    </section>
  );
}
