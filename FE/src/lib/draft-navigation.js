import { useLayoutEffect, useRef } from "react";
import { confirmDialog, notify } from "../components/NotificationProvider.jsx";

const drafts = new Set();
let leavePrompt = null;
export function useDraftGuard({ dirty, busy = false, message }) {
  const current = useRef(null);
  current.current = { dirty, busy, message };
  useLayoutEffect(() => {
    drafts.add(current);
    return () => drafts.delete(current);
  }, []);
}
const active = () => [...drafts].map((ref) => ref.current).filter(Boolean);
export async function mayLeaveDrafts() {
  if (active().some((draft) => draft.busy)) {
    notify(
      "Đang xử lý yêu cầu. Vui lòng chờ kết quả trước khi rời trang.",
      "warning",
    );
    return false;
  }
  const dirty = active().filter((draft) => draft.dirty);
  if (!dirty.length) return true;
  if (!leavePrompt)
    leavePrompt = confirmDialog(
      dirty.length === 1
        ? (dirty[0].message ?? "Bỏ nội dung chưa lưu và chuyển trang?")
        : "Bỏ các thay đổi chưa lưu và chuyển trang?",
      { confirmLabel: "Bỏ thay đổi", cancelLabel: "Ở lại" },
    ).finally(() => {
      leavePrompt = null;
    });
  const answer = await leavePrompt;
  return answer && !active().some((draft) => draft.busy);
}

// Delay React route changes, rather than unmounting a form when the URL moves.
// Native entry keys also cover history created before this app mount. Older
// browsers retain the draft/URL via replacement instead of guessing a delta.
export function installDraftNavigation(onRoute) {
  const snapshot = () => ({
    href: location.href,
    key: window.navigation?.currentEntry?.key,
  });
  let committed = snapshot();
  let pending = false;
  let restoring = false;
  let approvedHref = null;
  let live = true;
  let allowUnload = false;
  function commit() {
    onRoute();
    // Auth links may scrub tokens with replaceState inside onRoute.
    committed = snapshot();
    window.dispatchEvent(new Event("workflow:route-committed"));
  }
  function restore() {
    function replaceURL() {
      history.replaceState(history.state, "", committed.href);
      committed = snapshot();
      restoring = false;
    }
    if (location.href === committed.href) {
      return;
    }
    if (committed.key && typeof window.navigation?.traverseTo === "function") {
      restoring = true;
      try {
        const traversal = window.navigation.traverseTo(committed.key);
        traversal.committed.catch(() => {});
        traversal.finished.catch(() => {
          if (live) replaceURL();
        });
      } catch {
        replaceURL();
      }
    } else replaceURL();
  }
  async function changed(event) {
    if (!live || event.newURL !== location.href) return;
    if (restoring && location.href === committed.href) {
      restoring = false;
      return;
    }
    if (pending) return;
    const approved = approvedHref === location.href;
    approvedHref = null;
    if (approved) {
      commit();
      return;
    }
    pending = true;
    const allowed = await mayLeaveDrafts();
    pending = false;
    if (!live) return;
    if (allowed) commit();
    else restore();
  }
  async function click(event) {
    const link = event.target.closest?.("a[href]");
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      link.target === "_blank" ||
      link.hasAttribute("download") ||
      link.href === location.href
    )
      return;
    if (!active().some((draft) => draft.dirty || draft.busy)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending || restoring) return;
    pending = true;
    const href = link.href;
    const allowed = await mayLeaveDrafts();
    pending = false;
    if (live && allowed) {
      approvedHref = href;
      const target = new URL(href);
      allowUnload =
        target.origin !== location.origin ||
        target.pathname !== location.pathname ||
        target.search !== location.search;
      location.assign(href);
    }
  }
  function unload(event) {
    if (allowUnload) {
      allowUnload = false;
      return;
    }
    if (active().some((draft) => draft.dirty || draft.busy)) {
      event.preventDefault();
      event.returnValue = "";
    }
  }
  window.addEventListener("hashchange", changed);
  document.addEventListener("click", click, true);
  window.addEventListener("beforeunload", unload);
  return () => {
    live = false;
    window.removeEventListener("hashchange", changed);
    document.removeEventListener("click", click, true);
    window.removeEventListener("beforeunload", unload);
  };
}
