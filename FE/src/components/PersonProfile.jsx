import { useEffect, useId, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";

const statuses = { active: "Đang tham gia", organization_management: "Quản trị theo quyền tổ chức", guest: "Guest · Xem và bình luận", left_organization: "Đã rời tổ chức", left_workspace: "Đã rời Workspace", left_project: "Không còn tham gia Project", unavailable: "Không còn quyền trong Project" };
const roles = { lead: "Project Lead", manager: "Workspace Manager", member: "Member", owner: "Workspace Owner", organization_owner: "Organization Owner", organization_admin: "Organization Admin", guest: "Guest" };
export default function PersonProfile({ api, projectId, user }) {
  const [open, setOpen] = useState(false), [profile, setProfile] = useState(null), [error, setError] = useState("");
  const trigger = useRef(null), panel = useRef(null);
  const panelId = useId();
  const [position, setPosition] = useState({ left: 16, top: 16 });
  useEffect(() => {
    if (!open) return;
    let live = true; setProfile(null); setError("");
    api.request(`/projects/${projectId}/people/${user.id}/profile`).then(result => { if (live) setProfile(result.profile); }).catch(() => { if (live) setError("Thông tin không còn khả dụng với quyền hiện tại."); });
    return () => { live = false; };
  }, [open, api, projectId, user.id]);
  function place() {
    const rect = trigger.current.getBoundingClientRect();
    const height = panel.current?.getBoundingClientRect().height || 230;
    setPosition({ left: Math.max(16, Math.min(rect.left, innerWidth - Math.min(288, innerWidth - 32) - 16)), top: Math.max(16, Math.min(rect.bottom + 8, innerHeight - height - 16)) });
  }
  useEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, profile]);
  function show() {
    if (panel.current && !panel.current.matches(":popover-open")) {
      place();
      panel.current.showPopover?.({ source: trigger.current });
      setOpen(true);
    }
  }
  function close() { panel.current?.hidePopover?.(); setOpen(false); }
  return (
    <span className="person-profile">
      <button ref={trigger} type="button" popoverTarget={panelId} className="person-profile-trigger" aria-label={`Hồ sơ của ${user.displayName}`} aria-expanded={open}
        onMouseEnter={show} onFocus={event => { if (!panel.current?.contains(event.relatedTarget)) show(); }} onClick={event => { event.preventDefault(); show(); }}><Avatar user={user} />{user.displayName}</button>
      <span id={panelId} ref={panel} popover="auto" role="region" aria-label={`Thông tin của ${user.displayName}`} className="person-profile-card" style={position}
        onToggle={() => setOpen(Boolean(panel.current?.matches(":popover-open")))}>
        <button type="button" className="profile-close" aria-label="Đóng hồ sơ" onClick={close}>×</button>
        <strong>{profile?.displayName ?? user.displayName}</strong>
        {!profile && !error && <span className="feedback loading-state" role="status">Đang tải hồ sơ…</span>}
        {error && <span className="feedback error" role="alert">{error}</span>}
        {profile && <><span>{statuses[profile.status] ?? statuses.unavailable}</span>{profile.role && <span>{roles[profile.role] ?? profile.role}</span>}
          {profile.departedAt && <span>{new Date(profile.departedAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</span>}
          {profile.blocked && <span>Bị chặn trong phạm vi này</span>}</>}
      </span>
    </span>
  );
}
