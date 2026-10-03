'use strict';
// Local design review only. No API, browser storage, autosave or realtime delivery.
const myTasksBase = renderBackground;
renderBackground = function(...args) {
  myTasksBase(...args);
  if (background === 'home') {
    const title = document.querySelector('#content .titlebar');
    title?.classList.add('hero');
    const heading = title?.querySelector('h1');
    if (heading) heading.innerHTML = 'Chào Minh, hôm nay mình cùng làm <span style="white-space:nowrap">gì? ✨</span>';
  }
  if (background === 'mine') {
    const h = document.querySelector('#content .titlebar');
    const intro = document.createElement('p'); intro.className = 'gallery-note';
    intro.textContent = 'Công việc được giao cho bạn, xuyên các Workspace. Mặc định: Project Active · Chưa hoàn thành · Mới tạo trước.';
    h?.after(intro);
  }
};
const navWithStates = nav;
nav = function(...args) {
  navWithStates(...args);
  const b = document.createElement('button'); b.textContent = '◈ Trạng thái & quyền';
  b.onclick = () => { if (draftDirty && !confirm('Bỏ nội dung chưa lưu để xem trạng thái mẫu?')) return; draftDirty = false; location.hash = 'states'; };
  document.querySelector('#navigation').append(b);
};
const baseRender = render;
render = function() {
  if (location.hash !== '#states') return baseRender();
  if (currentView) viewCache.set(currentView,{values:Object.fromEntries([...document.querySelectorAll('.filters input,.filters select')].map(e=>[e.id,e.value])),scroll:window.scrollY});
  currentView=null;
  document.querySelector('#overlay').classList.add('hidden');
  nav('states'); document.querySelector('#breadcrumb').textContent = 'Workflow › Trạng thái thiết kế';
  document.querySelector('#content').innerHTML = `<div class="titlebar"><div><span class="eyebrow">COMPONENTS & STATES</span><h1>Thiết kế cho cả những lúc chưa suôn sẻ</h1></div><button id="goMine">Xem My Tasks →</button></div><p class="gallery-note">Các tình huống dưới đây là mô phỏng riêng để review UI. Không thay đổi quyền hoặc dữ liệu thật.</p><div class="state-grid">
  <section class="state-preview"><h2>Task · Quyền hiện tại</h2><div class="state-role" id="stateRoles"></div><div id="permissionExample"></div></section>
  <section class="state-preview"><h2>Đang tải danh sách</h2><p role="status">Đang tải công việc…</p><div class="loading-row"><div class="skeleton"></div><div class="skeleton short"></div></div><div class="loading-row"><div class="skeleton"></div><div class="skeleton short"></div></div></section>
  <section class="state-preview"><h2>Không có kết quả phù hợp</h2><div class="empty">Không tìm thấy công việc với bộ lọc này.<p>Thử từ khóa khác hoặc bỏ bộ lọc.</p><button id="emptyReset">Xóa bộ lọc và xem My Tasks</button></div></section>
  <section class="state-preview"><h2>Tải thất bại</h2><div class="banner error" role="alert">Chưa tải được công việc. Bộ lọc của bạn vẫn được giữ.</div><button id="retryPreview">Thử lại trong mẫu</button><p id="retryStatus" role="status"></p></section>
  <section class="state-preview"><h2>Hai người sửa đồng thời</h2><div class="banner error">Task vừa được người khác cập nhật. Bản nháp của bạn vẫn ở đây.</div><label>Bản nháp của bạn<textarea id="conflictDraft">Chuẩn hóa giao diện My Tasks với bộ lọc thời gian.</textarea></label><details><summary>Xem dữ liệu mới để đối chiếu</summary><p>Chuẩn hóa My Tasks và xử lý trạng thái Project Archived.</p></details><p>Đối chiếu rồi chỉnh lại bản nháp trước khi lưu. Không tự ghi đè hoặc thử lại bản cũ.</p><button id="conflictCompare">Đã đối chiếu, tiếp tục sửa</button></section>
  <section class="state-preview"><h2>Lưu / validation / đóng panel</h2><label>Tiêu đề Task<input id="saveDraft" value="Thiết kế My Tasks" maxlength="300"></label><p id="saveError" class="field-error" role="alert"></p><p id="saveStatus" role="status">Chưa có thay đổi</p><div class="buttons"><button id="saveCancel">Hủy thay đổi</button><button class="primary" id="savePreview" disabled>Lưu thay đổi</button><button id="closePreview">Đóng</button></div><p class="count-note">Đây là mô phỏng explicit save. Bản nháp chỉ nằm trong tab.</p></section>
  <section class="state-preview"><h2>Task không còn khả dụng</h2><div class="banner readonly">Bạn hiện không thể xem công việc này.</div><p>Trở về nơi bạn còn quyền truy cập; không hiển thị nội dung Task đã mất quyền.</p><button id="unavailableHome">Về Trang chủ</button></section>
  <section class="state-preview"><h2>Đã rời Workspace · Task Done</h2><span class="tag">Hoàn thành</span><p>Bảo Anh <span class="tag">Đã rời</span></p><p>Done giữ assignee lịch sử. Khi mở lại, hệ thống bỏ assignee đã rời. Gia nhập lại không tự giao lại những Task đã bỏ assignee.</p></section></div>`;
  document.querySelector('#goMine').onclick = document.querySelector('#emptyReset').onclick = () => { location.hash = 'mine'; };
  document.querySelector('#unavailableHome').onclick = () => { location.hash = 'home'; };
  const roles = ['Owner / Creator','Assignee','Member','Archived'];
  roles.forEach((r,i) => { const b=document.createElement('button'); b.textContent=r; b.onclick=()=>showPermission(i); document.querySelector('#stateRoles').append(b); });
  function showPermission(index) {
    document.querySelectorAll('#stateRoles button').forEach((b,i)=>b.classList.toggle('active',i===index));
    const edit=index===0, status=index<2;
    document.querySelector('#permissionExample').innerHTML=`<div class="banner ${index===3?'readonly':''}">${index===3?'Project đã lưu trữ · Chỉ đọc':roles[index]+' · Project Active'}</div><h3>Review giao diện trước khi dựng FE</h3><p>Deadline: 05/10/2026 16:30 · Giờ Việt Nam</p><label>Trạng thái <select ${status?'':'disabled'}><option>Chưa làm</option><option>Đang làm</option><option>Hoàn thành</option></select></label><div class="buttons">${edit?'<button>Chỉnh sửa nội dung</button><button>Phân công / Deadline</button><button>Xóa Task</button>':''}</div><p>${index===1?'Bạn được đổi trạng thái; nội dung và phân công chỉ đọc.':index===2?'Bạn được đọc Task và bình luận theo quyền hiện tại.':index===3?'Task và bình luận đều chỉ đọc. Owner có thể mở lại Project.':'Bạn được sửa nội dung, phân công, deadline, status và xóa Task.'}</p><p>Bình luận của bạn: ${index===3?'Chỉ đọc':'Chỉnh sửa / Xóa'} · Bình luận người khác: Chỉ đọc.</p>`;
  }
  showPermission(0);
  document.querySelector('#retryPreview').onclick = function() { this.disabled=true; this.textContent='Đang thử lại…';setTimeout(()=>{this.disabled=false;this.textContent='Thử lại trong mẫu';document.querySelector('#retryStatus').textContent='Mẫu đã tải lại. API chưa được kết nối.';},450); };
  document.querySelector('#conflictCompare').onclick=()=>{document.querySelector('#conflictDraft').focus();toast('Bản nháp được giữ để bạn sửa sau khi đối chiếu.');};
  let snapshot='Thiết kế My Tasks',dirty=false;
  const input=document.querySelector('#saveDraft'),save=document.querySelector('#savePreview'),status=document.querySelector('#saveStatus'),error=document.querySelector('#saveError');
  input.oninput=()=>{dirty=input.value!==snapshot;draftDirty=dirty;error.textContent=input.value.trim()?'':'Tiêu đề không được để trống.';save.disabled=!dirty||!input.value.trim();status.textContent=dirty?'Có thay đổi chưa lưu':'Chưa có thay đổi';};
  document.querySelector('#saveCancel').onclick=()=>{input.value=snapshot;input.oninput();};
  save.onclick=()=>{save.disabled=true;input.disabled=true;status.textContent='Đang lưu…';setTimeout(()=>{snapshot=input.value;dirty=false;draftDirty=false;input.disabled=false;status.textContent='Đã lưu trong mẫu';},450);};
  document.querySelector('#closePreview').onclick=()=>{if(dirty&&!confirm('Bỏ thay đổi chưa lưu?'))return;draftDirty=false;location.hash='mine';};
};
window.onhashchange=render;
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){const search=document.querySelector('#search');if(search&&!document.querySelector('#overlay:not(.hidden)')){e.preventDefault();search.focus();}}});
document.querySelector('.notice strong').textContent='Workflow · Stitch/Figma review v1';
document.querySelector('.notice small').textContent='Mẫu tương tác local · dữ liệu giả · chưa nối API';
document.querySelector('#sidebar .footer-note').textContent='Nền kem · tím chủ đạo · đa sắc pastel. My Tasks và các trạng thái bổ sung theo nghiệp vụ đã chốt.';
document.querySelector('.header-actions').insertAdjacentHTML('afterbegin','<span class="lang">VI / EN</span>');
render();
