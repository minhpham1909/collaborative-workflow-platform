'use strict';
// Appearance only; interactions remain the local mock from core.js.
const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  list: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 8 1 1 2-2m-3 7 1 1 2-2m3-5h3m-3 6h3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zm-9 9 9 5 9-5M3 16l9 5 9-5"/>'
};
function icon(name, small=false) {
  return `<svg class="ui-icon${small?' small':''}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.grid}</svg>`;
}
function decorateNavigation() {
  document.querySelectorAll('#navigation [data-go],#workspaceNav [data-go]').forEach(button=>{
    if(button.dataset.polished)return;
    button.insertAdjacentHTML('afterbegin',icon(button.dataset.go==='home'?'home':button.dataset.go==='mine'?'list':'folder'));
    button.dataset.polished='true';
  });
  document.querySelectorAll('#workspaceNav p.muted').forEach(p=>{
    if(p.textContent.includes('batch tiếp theo'))p.hidden=true;
  });
}
function decorateMain() {
  decorateNavigation();
  document.querySelectorAll('#content > p.muted').forEach(p=>{
    if(p.textContent.includes('Bộ lọc trong mẫu'))p.textContent='Thứ tự: mới tạo trước';
  });
  const title=$('#content .titlebar h1');
  if(title&&!title.dataset.polished) {
    const label=background==='home'?'VÙNG LÀM VIỆC CÁ NHÂN':background==='mine'?'CÔNG VIỆC ĐƯỢC GIAO':background.startsWith('board:')?'PROJECT BOARD':'WORKSPACE';
    title.insertAdjacentHTML('beforebegin',`<span class="eyebrow">${label}</span>`);
    title.dataset.polished='true';
  }
  const create=$('#content .titlebar #create');
  if(create&&!create.dataset.polished){create.insertAdjacentHTML('afterbegin',icon('plus',true));create.dataset.polished='true'}
  document.querySelectorAll('.cards .card').forEach(card=>{
    if(card.dataset.polished)return;
    card.insertAdjacentHTML('afterbegin',`<div class="workspace-symbol">${icon(background==='home'?'layers':'folder')}</div>`);
    const button=card.querySelector('.actions button');
    button?.insertAdjacentHTML('beforeend',' '+icon('arrow',true));
    card.dataset.polished='true';
  });
  document.querySelectorAll('.column h2').forEach(h=>{
    if(h.dataset.polished)return;
    const text=h.textContent,match=text.match(/^(.*) \((\d+)\)$/);
    if(match)h.innerHTML=`<span class="status-dot"></span>${esc(match[1])}<span class="column-count">${match[2]}</span>`;
    h.dataset.polished='true';
  });
  document.querySelectorAll('.taskcard').forEach(card=>{
    if(card.dataset.polished)return;
    const person=card.querySelector('p'),date=card.querySelector('p:last-child');
    if(person){const name=person.textContent;person.classList.add('task-person');person.innerHTML=name.startsWith('Chưa')?`${icon('user',true)} ${esc(name)}`:`<span class="avatar">${esc(name.charAt(0))}</span>${esc(name)}`}
    if(date){date.classList.add('task-date');date.insertAdjacentHTML('afterbegin',icon('clock',true))}
    card.dataset.polished='true';
  });
  document.querySelectorAll('.tag').forEach(tag=>{
    if(tag.textContent.includes('Owner')||tag.textContent==='Active')tag.classList.add('owner');
    if(tag.textContent.includes('Archived'))tag.classList.add('archived');
  });
}
function decorateComments() {
  document.querySelectorAll('.comment').forEach(comment=>{
    if(comment.dataset.polished)return;
    const author=comment.querySelector('strong'),time=comment.querySelector('small');
    if(author&&time){const row=document.createElement('div');row.className='comment-author';row.innerHTML=`<span class="avatar">${esc(author.textContent.charAt(0))}</span>`;comment.prepend(row);row.append(author,time)}
    comment.dataset.polished='true';
  });
}
function decoratePanel() {
  decorateComments();
  const label=$('.panel-top .muted');if(label)label.textContent='TASK DETAIL';
  const toolbar=$('.panel .toolbar');if(toolbar)toolbar.textContent='Vùng soạn thảo · bản thiết kế dùng văn bản mẫu';
  document.querySelectorAll('.panel > p.muted').forEach(p=>{
    if(p.textContent.includes('chưa kiểm schema'))p.textContent='Bình luận mới xuất hiện ở đầu danh sách.';
  });
}
const baseNavigation=nav;
nav=function(...args){baseNavigation(...args);decorateNavigation()};
const baseBackground=renderBackground;
renderBackground=function(...args){baseBackground(...args);decorateMain()};
const baseTask=openTask;
openTask=function(...args){baseTask(...args);decoratePanel()};
const baseComments=drawComments;
drawComments=function(...args){baseComments(...args);decorateComments()};
document.addEventListener('input',()=>queueMicrotask(decorateMain));
document.addEventListener('click',()=>queueMicrotask(decorateMain));
const brand=$('#sidebar > strong');brand.innerHTML=`<span class="brand-mark">${icon('layers')}</span>Workflow`;
const profile=$('.header-actions');profile.innerHTML='<div class="user-chip"><span class="avatar">M</span><div><strong>Minh Phạm</strong><small>Tài khoản mẫu</small></div></div>';
const roleControl=$('.demo-control');$('.notice').append(roleControl);
$('#sidebar .footer-note').textContent='Bản thiết kế visual v0.1. Những màn còn lại sẽ dùng cùng hệ thống giao diện.';
render();
