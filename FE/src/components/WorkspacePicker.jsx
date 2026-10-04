import { useEffect, useId, useRef, useState } from "react";
import FormField from "./FormField.jsx";
import { messageFor } from "../lib/messages.js";

// Keep the selected identity independently of a paginated search result.
export default function WorkspacePicker({
  api,
  value,
  onChange,
  selectedWorkspace,
  disabled,
  resetKey,
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const searchId = useId();
  const [data, setData] = useState({ items: [] });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setQuery("");
    setSearching(false);
  }, [resetKey]);
  const selected = useRef(selectedWorkspace);
  const generation = useRef(0);
  const loading = useRef(false);
  if (selectedWorkspace?.id === value) selected.current = selectedWorkspace;
  async function load(cursor, token) {
    if (loading.current && cursor) return;
    loading.current = true;
    setBusy(true);
    setError("");
    const params = new URLSearchParams({ limit: "20" });
    if (query.trim()) params.set("q", query.trim());
    if (cursor) params.set("cursor", cursor);
    try {
      const result = await api.request(`/workspaces?${params}`);
      if (token !== generation.current) return;
      setData((old) => ({
        ...result,
        items: cursor ? [...old.items, ...result.items] : result.items,
      }));
      const match = result.items.find((workspace) => workspace.id === value);
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
  }, [api, query, revision]);
  const missing =
    value && !data.items.some((workspace) => workspace.id === value);
  return (
    <div className="workspace-picker" aria-busy={busy}>
      <div hidden={!searching} id={searchId}>
        <FormField
          label="Tìm Workspace"
          hint="Tìm theo tên hoặc mô tả; Workspace đã chọn vẫn được giữ."
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
      </div>
      <FormField
        label="Workspace"
        hint={
          busy
            ? "Đang tải Workspace…"
            : !data.items.length
              ? query.trim()
                ? "Không có Workspace phù hợp. Thử tên khác hoặc xóa tìm kiếm."
                : "Chưa có Workspace để chọn."
              : "Lọc theo Workspace."
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
                data.items.find(
                  (workspace) => workspace.id === e.target.value,
                ) ?? selected.current;
              onChange(e.target.value);
            }}
          >
            <option value="">Tất cả Workspace</option>
            {missing && (
              <option value={value}>
                {selected.current?.id === value
                  ? selected.current.name
                  : "Workspace đã chọn"}
              </option>
            )}
            {data.items.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <div className="picker-actions">
        <button
          type="button"
          aria-expanded={searching}
          aria-controls={searchId}
          onClick={() => setSearching((v) => !v)}
        >
          Tìm Workspace
        </button>
        {query && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setQuery("")}
          >
            Xóa tìm kiếm Workspace
          </button>
        )}
        {error && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setRevision((v) => v + 1)}
          >
            Thử tải Workspace lại
          </button>
        )}
        {!error && data.nextCursor && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => load(data.nextCursor, generation.current)}
          >
            {busy ? "Đang tải…" : "Tải thêm Workspace"}
          </button>
        )}
      </div>
    </div>
  );
}
