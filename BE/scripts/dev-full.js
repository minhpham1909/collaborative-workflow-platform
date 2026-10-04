// Explicit opt-in: this starts the mail worker, which can deliver queued mail.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));
console.info(
  "DEV_FULL: starting API and mail worker; eligible queued mail will be processed.",
);
let stopping = false;
const children = [];
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) if (child.exitCode === null) child.kill();
}
for (const entry of ["src/server.js", "scripts/mail-worker.js"]) {
  const child = spawn(process.execPath, ["--env-file-if-exists=.env", entry], {
    cwd,
    stdio: "inherit",
  });
  children.push(child);
  child.on("error", () => {
    console.error("DEV_FULL_CHILD_FAILED");
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
