import { lazy, Suspense } from "react";
const Editor = lazy(() => import("./EditorCore.jsx"));
export default function RichEditor(props) {
  return (
    <Suspense fallback={<p role="status">Đang tải trình soạn thảo…</p>}>
      <Editor {...props} />
    </Suspense>
  );
}
