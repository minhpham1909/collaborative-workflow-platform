import { InlineMessage, LoadingState } from "./Feedback.jsx";
import { lazy, Suspense } from "react";
const Editor = lazy(() => import("./EditorCore.jsx"));
export default function RichEditor(props) {
  return (
    <Suspense fallback={<LoadingState>Đang tải trình soạn thảo…</LoadingState>}>
      <Editor {...props} />
    </Suspense>
  );
}
