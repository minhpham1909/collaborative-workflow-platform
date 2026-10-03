const api = 'http://localhost:4000/auth';
const result = document.querySelector('#result');
let accessToken = null;
let capabilities;
const linkToken = new URLSearchParams(location.hash.slice(1)).get('token');
if (linkToken) history.replaceState(null, '', location.pathname);
function show(value) { result.textContent = JSON.stringify(value, null, 2); }
async function request(path, body, authenticated = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated) {
    if (!accessToken) throw new Error('Cần đăng nhập trên trang này trước.');
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(api + path, { method: 'POST', credentials: 'include', headers, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.code ?? `HTTP_${response.status}`);
  if (data.accessToken) accessToken = data.accessToken;
  show(data.user ? { email: data.user.email, emailVerified: data.user.emailVerified, code: 'LOGIN_OK' } : data);
  return data;
}
function run(operation) { Promise.resolve().then(operation).catch((error) => show({ error: error.message })); }
function terms() { return { termsAccepted: document.querySelector('#terms').checked, termsVersion: capabilities.termsVersion }; }
document.querySelector('#account').addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const action = event.submitter.value;
  run(async () => {
    const email = fields.get('email'); const password = fields.get('password');
    switch (action) {
      case 'register': await request('/register', { displayName: fields.get('displayName'), email, password, ...terms() }); break;
      case 'login': await request('/login', { email, password }); break;
      case 'recovery': await request('/password/recovery', { email }); break;
    }
  });
});
document.querySelector('#resend').addEventListener('click', () => run(() => request('/verify-email/resend', {}, true)));
document.querySelector('#verify').addEventListener('click', () => run(() => request('/verify-email', { token: linkToken })));
document.querySelector('#reset').addEventListener('submit', (event) => {
  event.preventDefault(); const password = new FormData(event.currentTarget).get('password');
  run(async () => { await request('/password/reset', { token: linkToken, password }); accessToken = null; });
});
let googleLoaded;
function loadGoogle() {
  googleLoaded ??= new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = resolve; script.onerror = () => reject(new Error('Không tải được Google Identity Services.'));
    document.head.append(script);
  });
  return googleLoaded;
}
const prepareGoogle = document.querySelector('#prepareGoogle');
prepareGoogle.addEventListener('click', () => run(async () => {
  await loadGoogle(); const { nonce } = await request('/google/challenge', {});
  google.accounts.id.initialize({ client_id: capabilities.googleClientId, nonce, auto_select: false,
    callback: ({ credential }) => run(() => request('/google', { credential, ...terms() })) });
  google.accounts.id.renderButton(document.querySelector('#googleButton'), { type: 'standard', theme: 'outline', size: 'large' });
  prepareGoogle.disabled = true;
  show({ code: 'GOOGLE_READY', message: 'Nhấn nút Google bên dưới trong 5 phút. Hết hạn thì tải lại trang.' });
}));
if (linkToken && ['/verify-email', '/reset-password'].includes(location.pathname)) {
  document.querySelector('#emailLink').hidden = false;
  const verifying = location.pathname === '/verify-email';
  document.querySelector('#verify').hidden = !verifying; document.querySelector('#reset').hidden = verifying;
  document.querySelector('#linkPurpose').textContent = verifying ? 'Nhấn để xác minh email.' : 'Nhập mật khẩu mới.';
}
run(async () => {
  const response = await fetch(api + '/capabilities');
  if (!response.ok) throw new Error('Backend capabilities unavailable');
  capabilities = await response.json();
  document.querySelector('#configuration').textContent = `Backend sẵn sàng; Terms: ${capabilities.termsVersion}; Google: ${capabilities.googleClientId ? 'đã cấu hình' : 'chưa cấu hình'}.`;
  prepareGoogle.disabled = !capabilities.googleClientId;
});
