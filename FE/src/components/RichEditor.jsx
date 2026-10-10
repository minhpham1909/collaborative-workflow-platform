import { workspaceText } from '../lib/workspace-text.js';
import { InlineMessage, LoadingState } from "./Feedback.jsx";
import { lazy, Suspense } from "react";
const Editor = lazy(() => import("./EditorCore.jsx"));
export default function RichEditor(props) {
  return (
    <Suspense fallback={<LoadingState>{workspaceText("Đang tải trình soạn thảo…", props.locale ?? "vi")}</LoadingState>}>
      <Editor {...props} />
    </Suspense>
  );
}
