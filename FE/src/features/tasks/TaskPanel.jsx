import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { taskText } from '../../lib/task-text.js';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useDialogFocus from '../../components/useDialogFocus.js';
import { mayLeaveDrafts } from '../../lib/draft-navigation.js';
import TaskDetail from './TaskDetail.jsx';
export default function TaskPanel({ api, id, projectId, onClose, returnTo, onFullPage }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => taskText(value, locale, values);
  const panel = useRef(null), close = useRef(null), [busy, setBusy] = useState(false);
  close.current = async () => { if (!busy && await mayLeaveDrafts()) onClose(); };
  useDialogFocus(panel, () => close.current());
  return createPortal(<div className="overlay task-panel-overlay"><section ref={panel} className="task-panel" role="dialog" aria-modal="true" aria-label={tr("Chi tiết Task")} tabIndex={-1}><div className="task-panel-bar"><a onClick={onFullPage} href={`#task/${id}${returnTo?'?returnTo='+encodeURIComponent(returnTo):''}`}>{tr("Toàn trang ↗")}</a><button aria-label={tr("Đóng chi tiết Task")} disabled={busy} onClick={() => close.current()}>{tr("Đóng")}</button></div><TaskDetail api={api} id={id} expectedProjectId={projectId} onBusyChange={setBusy} onDeleted={onClose} returnTo={returnTo} onReturnProject={returnTo ? undefined : () => close.current()} onReturnMine={returnTo ? () => close.current() : undefined} /></section></div>, document.body);
}
