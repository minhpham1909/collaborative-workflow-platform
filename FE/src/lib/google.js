let script;
export function loadGoogle() {
  if (window.google?.accounts) return Promise.resolve();
  if (!script)
    script = new Promise((resolve, reject) => {
      const node = document.createElement("script");
      node.src = "https://accounts.google.com/gsi/client";
      node.async = true;
      node.onload = resolve;
      node.onerror = () => {
        script = null;
        node.remove();
        reject(new Error("Google unavailable"));
      };
      document.head.append(node);
    });
  return script;
}
