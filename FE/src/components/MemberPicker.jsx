import { useEffect, useRef, useState } from "react";
import FormField from "./FormField.jsx";
import { messageFor } from "../lib/messages.js";

// Keep the selected identity independently of a paginated search result.
export default function MemberPicker({
  api,
  workspaceId,
  value,
  onChange,
  selectedMember,
  disabled,
}) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState({ items: [] });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const selected = useRef(selectedMember);
  const generation = useRef(0);
  const loading = useRef(false);
  if (selectedMember?.userId === value) selected.current = selectedMember;
  async function load(cursor, token) {
    if (loading.current && cursor) return;
    loading.current = true;
    setBusy(true);
    setError("");
    const params = new URLSearchParams({ limit: "20" });
    if (query.trim()) params.set("q", query.trim());
    if (cursor) params.set("cursor", cursor);
    try {
      const result = await api.request(
        `/workspaces/${workspaceId}/members?${params}`,
      );
      if (token !== generation.current) return;
      setData((old) => ({
        ...result,
        items: cursor ? [...old.items, ...result.items] : result.items,
      }));
      const match = result.items.find((member) => member.userId === value);
      if (match) selected.current = match;
    } catch (e) {
      if (token === generation.current) setError(messageFor(e));
    } finally {
      if (token === generation.current) {
        loading.current = false;
        setBusy(false);
      }
    }
  }
  useEffect(() => {
    const token = ++generation.current;
    loading.current = false;
    setData({ items: [] });
    setBusy(true);
    setError("");
    const timer = setTimeout(() => load(null, token), 250);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [api, workspaceId, query, revision]);
  const missing =
    value && !data.items.some((member) => member.userId === value);
  return (
    <div className="member-picker" aria-busy={busy}>
      <FormField
        label="Tìm thành viên"
        hint="Tìm theo tên trong Workspace; người đã chọn vẫn được giữ."
      >
        {(props) => (
          <input
            {...props}
            type="search"
            maxLength={200}
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </FormField>
      <FormField
        label="Người thực hiện"
        hint={
          busy
            ? "Đang tải thành viên…"
            : !data.items.length
              ? query.trim()
                ? "Không có thành viên phù hợp. Thử tên khác hoặc xóa tìm kiếm."
                : "Chưa có thành viên để chọn."
              : "Chọn một thành viên hoặc để chưa phân công."
        }
        error={error}
      >
        {(props) => (
          <select
            {...props}
            value={value}
            disabled={disabled || busy || Boolean(error)}
            onChange={(e) => {
              selected.current =
                data.items.find((member) => member.userId === e.target.value) ??
                selected.current;
              onChange(e.target.value);
            }}
          >
            <option value="">Chưa phân công</option>
            {missing && (
              <option value={value}>
                {selected.current?.userId === value
                  ? selected.current.displayName
                  : "Người đã chọn"}
                {selected.current?.left ? " · Đã rời" : ""}
              </option>
            )}
            {data.items.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <div className="picker-actions">
        {query && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setQuery("")}
          >
            Xóa tìm kiếm thành viên
          </button>
        )}
        {error && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setRevision((v) => v + 1)}
          >
            Thử tải thành viên lại
          </button>
        )}
        {!error && data.nextCursor && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => load(data.nextCursor, generation.current)}
          >
            {busy ? "Đang tải…" : "Tải thêm thành viên"}
          </button>
        )}
      </div>
    </div>
  );
}
