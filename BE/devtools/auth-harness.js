const api = 'http://localhost:4000/auth';
const result = document.querySelector('#result');
let accessToken = null;
let csrfToken = null;
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
  if (data.csrfToken) csrfToken = data.csrfToken;
  show(data.user ? { email: data.user.email, emailVerified: data.user.emailVerified, code: 'LOGIN_OK' } : data);
  return data;
}
function run(operation) { Promise.resolve().then(operation).catch((error) => show({ error: error.message })); }
function terms() { return { termsAccepted: document.querySelector('#terms').checked, termsVersion: capabilities.termsVersion }; }
async function checkMe(code = 'SESSION_OK') {
  if (!accessToken) throw new Error('Cần đăng nhập trên trang này trước.');
  const response = await fetch(api + '/me', { credentials: 'include', headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.code ?? `HTTP_${response.status}`);
  show({ code, meStatus: response.status, user: data.user });
}
document.querySelector('#me').addEventListener('click', () => run(() => checkMe()));
document.querySelector('#logout').addEventListener('click', () => run(async () => {
  if (!csrfToken) throw new Error('Cần đăng nhập trên trang này trước.');
  const response = await fetch(api + '/logout', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: '{}' });
  if (response.status !== 204) throw new Error('LOGOUT_FAILED');
  accessToken = null; csrfToken = null; location.reload();
}));
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
const prepareLink = document.querySelector('#prepareLink');
async function prepare(linking) {
  const passwordInput = document.querySelector('#linkPassword');
  let currentPassword = linking ? passwordInput.value : null;
  if (linking && (!accessToken || !currentPassword)) throw new Error('Đăng nhập mật khẩu trước, rồi nhập mật khẩu hiện tại để liên kết.');
  await loadGoogle();
  const { nonce } = await request(linking ? '/google/link/challenge' : '/google/challenge', {}, linking);
  passwordInput.value = '';
  google.accounts.id.initialize({ client_id: capabilities.googleClientId, nonce, auto_select: false,
    callback: ({ credential }) => run(async () => {
      try {
        await request(linking ? '/google/link' : '/google', linking ? { credential, currentPassword } : { credential, ...terms() }, linking);
        await checkMe(linking ? 'GOOGLE_LINKED_SESSION_OK' : 'GOOGLE_LOGIN_SESSION_OK');
      } finally { currentPassword = null; }
    }) });
  google.accounts.id.renderButton(document.querySelector('#googleButton'), { type: 'standard', theme: 'outline', size: 'large' });
  prepareGoogle.disabled = true; prepareLink.disabled = true;
  show({ code: linking ? 'GOOGLE_LINK_READY' : 'GOOGLE_READY', message: 'Chọn đúng tài khoản Google trong 5 phút. Sau liên kết, đăng xuất rồi thử đăng nhập Google. Hết hạn/lỗi thì tải lại trang.' });
}
prepareGoogle.addEventListener('click', () => run(() => prepare(false)));
prepareLink.addEventListener('click', () => run(() => prepare(true)));
async function invitationRequest(accepting) {
  if (accepting && !accessToken) throw new Error('Đăng nhập trên trang này trước rồi nhận lời mời.');
  const response = await fetch(`http://localhost:4000/invitations/${accepting ? 'accept' : 'preview'}`, { method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(accepting ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ token: linkToken }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.code ?? `HTTP_${response.status}`);
  show(data);
}
if (linkToken && location.pathname === '/invite') {
  document.querySelector('#invitation').hidden = false;
  document.querySelector('#invitePreview').addEventListener('click', () => run(() => invitationRequest(false)));
  document.querySelector('#inviteAccept').addEventListener('click', () => run(() => invitationRequest(true)));
}
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
  prepareLink.disabled = !capabilities.googleClientId;
});
