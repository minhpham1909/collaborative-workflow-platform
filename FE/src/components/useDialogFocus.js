import { useLayoutEffect, useRef } from "react";

const stack = [];
const original = new Map();
let previousOverflow = "";
const controls = (panel) =>
  [
    ...panel.querySelectorAll(
      'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]',
    ),
  ].filter(
    (node) =>
      !node.matches(":disabled") &&
      node.tabIndex >= 0 &&
      !node.closest("[inert]") &&
      getComputedStyle(node).visibility === "visible" &&
      node.getClientRects().length,
  );

function lockBackground() {
  const top = stack.at(-1);
  if (!top) {
    for (const [node, inert] of original) node.inert = inert;
    original.clear();
    document.body.style.overflow = previousOverflow;
    return;
  }
  for (const node of document.body.children) {
    if (!original.has(node)) original.set(node, node.inert);
    node.inert = !node.contains(top.panel);
  }
}

// Only the top dialog owns keyboard input, including nested discard prompts.
export default function useDialogFocus(panelRef, onClose, open = true) {
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const entry = { panel: panelRef.current, previous: document.activeElement };
    if (!stack.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    stack.push(entry);
    lockBackground();
    (controls(entry.panel)[0] ?? entry.panel).focus();
    const key = (event) => {
      if (stack.at(-1) !== entry) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close.current?.();
      } else if (event.key === "Tab") {
        const nodes = controls(entry.panel),
          first = nodes[0],
          last = nodes.at(-1);
        if (
          !first ||
          !entry.panel.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last)
        ) {
          event.preventDefault();
          (event.shiftKey
            ? (last ?? entry.panel)
            : (first ?? entry.panel)
          ).focus();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      const wasTop = stack.at(-1) === entry;
      stack.splice(stack.indexOf(entry), 1);
      document.removeEventListener("keydown", key, true);
      lockBackground();
      if (wasTop) {
        const previous = entry.previous;
        if (
          previous?.isConnected &&
          !previous.closest("[inert]") &&
          !previous.matches(":disabled")
        )
          previous.focus();
        else if (stack.length)
          (controls(stack.at(-1).panel)[0] ?? stack.at(-1).panel).focus();
      }
    };
  }, [open, panelRef]);
}
