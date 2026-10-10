// UI-only test surface. Never imports API clients or production account data.
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import NotificationProvider, { notify, confirmDialog } from '../src/components/NotificationProvider.jsx';
import useDialogFocus from '../src/components/useDialogFocus.js';
import { AuthLocaleProvider, AuthLanguageSwitch } from '../src/features/auth/AuthLocale.jsx';
import '../src/styles.css';
import '../src/studio.css';
import '../src/foundation.css';
function Modal({ close }) {
  const panel = useRef(null);
  useDialogFocus(panel, close);
  return createPortal(<div className="overlay"><section ref={panel} tabIndex={-1} className="dialog" role="dialog" aria-modal="true" aria-label="Fixture form"><h2>Fixture form</h2><label>Draft<input /></label><button onClick={() => notify('Saved from dialog')}>Notify inside dialog</button><button onClick={async () => { await confirmDialog('Nested confirmation'); }}>Nested confirm</button><button onClick={close}>Close fixture form</button></section></div>, document.body);
}
function Fixture() {
  const [open, setOpen] = useState(false);
  return <main style={{ padding: 24, minHeight: '100vh' }}><h1>Feedback test fixture</h1><AuthLanguageSwitch /><div className="buttons"><button onClick={() => { for (let i = 1; i <= 4; i++) notify('Success '+i); }}>Burst</button><button onClick={() => notify('Critical error', 'error')}>Error</button><button onClick={() => notify('Success 1')}>Duplicate</button><button onClick={() => setOpen(true)}>Open form</button><button onClick={() => window.dispatchEvent(new Event('workflow:account-changed'))}>Change account fixture</button></div><label>Content<input /></label><div style={{ height: '80vh' }} /><button>Bottom action</button>{open && <Modal close={() => setOpen(false)} />}</main>;
}
createRoot(document.getElementById('root')).render(<AuthLocaleProvider><NotificationProvider><Fixture /></NotificationProvider></AuthLocaleProvider>);
