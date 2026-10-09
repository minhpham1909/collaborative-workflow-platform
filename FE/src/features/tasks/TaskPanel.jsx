import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useDialogFocus from '../../components/useDialogFocus.js';
import { mayLeaveDrafts } from '../../lib/draft-navigation.js';
import TaskDetail from './TaskDetail.jsx';
export default function TaskPanel({ api, id, projectId, onClose, returnTo }) {
  const panel = useRef(null), close = useRef(null), [busy, setBusy] = useState(false);
  close.current = async () => { if (!busy && await mayLeaveDrafts()) onClose(); };
  useDialogFocus(panel, () => close.current());
  return createPortal(<div className="overlay task-panel-overlay"><section ref={panel} className="task-panel" role="dialog" aria-modal="true" aria-label="Chi tiết Task" tabIndex={-1}><div className="task-panel-bar"><a href={`#task/${id}${returnTo?'?returnTo='+encodeURIComponent(returnTo):''}`}>Toàn trang ↗</a><button aria-label="Đóng chi tiết Task" disabled={busy} onClick={() => close.current()}>Đóng</button></div><TaskDetail api={api} id={id} expectedProjectId={projectId} onBusyChange={setBusy} onDeleted={onClose} returnTo={returnTo} onReturnProject={returnTo ? undefined : () => close.current()} onReturnMine={returnTo ? () => close.current() : undefined} /></section></div>, document.body);
}
