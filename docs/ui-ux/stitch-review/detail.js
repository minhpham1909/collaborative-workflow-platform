'use strict';
// Continuation of the local design prototype; all mutations stay in tab memory.
const graphemes = new Intl.Segmenter('vi', { granularity: 'grapheme' });
const wordSegments = new Intl.Segmenter('vi', { granularity: 'word' });
const textCount = value => ({ characters: [...graphemes.segment(value)].length, words: [...wordSegments.segment(value)].filter(s=>s.isWordLike).length });
function counter(value, limit) { const n=textCount(value);return `${n.words} từ · ${n.characters}/${limit} ký tự hiển thị`; }
let editedComment = null;
function discardDraft(message) { if(draftDirty&&!confirm(message))return false;draftDirty=false;editedComment=null;const composer=$('#commentText');if(composer){composer.value='';composer.oninput?.();}return true; }

drawComments = function(t) {
  const list=comments.filter(c=>c.tid===t.id).reverse(),active=project(t.pid).state==='active';
  $('#comments').innerHTML=list.length?list.map(c=>`<article class="comment" data-comment="${esc(c.id)}"><div class="comment-author"><span class="avatar">${esc(names[c.author].charAt(0))}</span><strong>${esc(names[c.author])}</strong><small class="muted">${esc(c.time)}</small></div><p class="comment-body">${esc(c.text)}</p>${c.author==='me'&&active?`<div class="comment-actions"><button data-edit-comment="${esc(c.id)}">Chỉnh sửa</button><button data-delete-comment="${esc(c.id)}">Xóa bình luận của tôi</button></div>`:''}</article>`).join(''):'<p class="muted">Chưa có bình luận.</p>';
  document.querySelectorAll('[data-edit-comment]').forEach(b=>b.onclick=()=>{
    if(!discardDraft('Bỏ nội dung chưa lưu để sửa bình luận này?'))return;
    const c=comments.find(c=>c.id===b.dataset.editComment);if(!c||c.author!=='me'||!active)return;
    const row=b.closest('.comment');editedComment=c.id;
    row.innerHTML=`<strong>Chỉnh sửa bình luận của bạn</strong><label class="editor-label" for="commentEdit">Nội dung</label><textarea id="commentEdit">${esc(c.text)}</textarea><p class="count-note" id="commentEditCount"></p><p class="field-error" id="commentEditError" role="alert"></p><div class="buttons"><button id="cancelCommentEdit">Hủy</button><button class="primary" id="saveCommentEdit" disabled>Lưu bình luận</button></div>`;
    const input=$('#commentEdit'),save=$('#saveCommentEdit');
    function update(){draftDirty=input.value!==c.text;const count=textCount(input.value);$('#commentEditCount').textContent=counter(input.value,5000);$('#commentEditError').textContent=!input.value.trim()?'Bình luận không được để trống.':count.characters>5000?'Bình luận vượt giới hạn ký tự.':'';save.disabled=!draftDirty||!input.value.trim()||count.characters>5000;}
    input.oninput=update;update();input.focus();
    $('#cancelCommentEdit').onclick=()=>{if(!discardDraft('Bỏ thay đổi bình luận chưa lưu?'))return;drawComments(t);};
    save.onclick=()=>{if(save.disabled)return;c.text=input.value.trim();c.time='Vừa sửa · mẫu';draftDirty=false;editedComment=null;drawComments(t);toast('Đã lưu bình luận trong mẫu.');};
  });
  document.querySelectorAll('[data-delete-comment]').forEach(b=>b.onclick=()=>{
    if(!discardDraft('Bỏ nội dung chưa lưu trước khi xóa bình luận?'))return;
    const id=b.dataset.deleteComment,c=comments.find(c=>c.id===id);
    if(c?.author==='me'&&active&&confirm('Xóa bình luận của bạn? Thao tác này loại bỏ nội dung bình luận trong mẫu.')){comments=comments.filter(c=>c.id!==id);drawComments(t);toast('Đã xóa bình luận trong mẫu.');}
  });
  document.querySelectorAll('#comments .comment').forEach(n=>n.dataset.polished='true');
};

const taskDetailBase=openTask;
openTask=function(id){
  editedComment=null;$('#content .full-task')?.remove();taskDetailBase(id);const t=task(id),panel=$('#overlay .panel');if(!t||!panel)return;
  const close=$('#close');close.insertAdjacentHTML('beforebegin','<button id="fullpage">Mở toàn trang ↗</button>');
  $('#fullpage').onclick=()=>{if(!discardDraft('Bỏ nội dung chưa lưu trước khi mở toàn trang?'))return;go('detail:'+id);};
  const state=$('#taskStatus'),change=state.onchange;
  state.onchange=e=>{if(!discardDraft('Bỏ nội dung chưa lưu trước khi đổi trạng thái?')){state.value=t.status;return;}change(e);};
  if(canEdit(t)){$('#edit').insertAdjacentHTML('afterend',' <button id="deleteTask">Xóa Task</button>');$('#deleteTask').onclick=()=>{if(!discardDraft('Bỏ nội dung chưa lưu trước khi xóa Task?'))return;if(!confirm('Xóa Task “'+t.title+'” và các bình luận của Task trong mẫu?'))return;tasks=tasks.filter(v=>v.id!==id);comments=comments.filter(v=>v.tid!==id);go(background);toast('Đã xóa Task trong mẫu.');};}
  const composer=$('#commentText');
  if(composer){
    composer.removeAttribute('maxlength');composer.insertAdjacentHTML('afterend','<p class="count-note" id="commentCount"></p><p class="field-error" id="commentError" role="alert"></p>');
    composer.oninput=()=>{const n=textCount(composer.value);draftDirty=!!composer.value;$('#commentCount').textContent=counter(composer.value,5000);$('#commentError').textContent=n.characters>5000?'Bình luận vượt giới hạn ký tự.':'';$('#send').disabled=n.characters>5000||!composer.value.trim()||editedComment!==null;};composer.oninput();
    const send=$('#send').onclick;$('#send').onclick=()=>{if($('#send').disabled||textCount(composer.value).characters>5000)return;send();composer.oninput();};
  }
  const full=route()==='detail:'+id;
  if(full){$('#content').replaceChildren(panel);panel.classList.add('full-task');panel.removeAttribute('aria-modal');panel.setAttribute('role','region');$('#overlay').classList.add('hidden');$('#fullpage').remove();close.textContent='Về danh sách';close.onclick=()=>go(background);$('.shell').inert=false;}
  else $('.shell').inert=true;
};

const detailEditBase=editTask;
editTask=function(t){detailEditBase(t);const form=$('#editForm');if(!form)return;$('.panel h2').id='editTaskTitle';$('.panel').setAttribute('aria-labelledby','editTaskTitle');
  const input=form.elements.description;input.insertAdjacentHTML('afterend','<p class="count-note" id="descriptionCount"></p><p class="field-error" id="descriptionError" role="alert"></p>');
  const submit=form.onsubmit;form.onsubmit=e=>{if(!form.elements.title.value.trim()||textCount(input.value).characters>10000){e.preventDefault();$('#descriptionError').textContent='Kiểm tra tiêu đề và giới hạn mô tả trước khi lưu.';return;}submit(e);};
  input.addEventListener('input',()=>{const n=textCount(input.value);$('#descriptionCount').textContent=counter(input.value,10000);$('#descriptionError').textContent=n.characters>10000?'Mô tả vượt giới hạn ký tự.':'';});$('#descriptionCount').textContent=counter(input.value,10000);
};
const detailRenderBase=render;
render=function(){
  $('.shell').inert=false;
  const r=route();if(!r.startsWith('detail:'))return detailRenderBase();
  const t=task(r.slice(7));$('#overlay').classList.add('hidden');
  if(!t){$('#content').innerHTML=empty('Task không khả dụng');nav('home');return;}
  if(!background.startsWith('board:')&&background!=='mine')background='board:'+t.pid;
  nav('task:'+t.id);openTask(t.id);
};
const createDetailBase=createForm;
createForm=function(...args){createDetailBase(...args);$('.shell').inert=true;const cancel=$('#cancelCreate'),close=cancel.onclick;cancel.onclick=()=>{close();if($('#overlay').classList.contains('hidden')){$('.shell').inert=false;lastFocus?.focus();}};};
let activeDetailRoute=route(),restoreRouteEvent=false;
window.onhashchange=()=>{if(restoreRouteEvent){restoreRouteEvent=false;return;}if(draftDirty&&!confirm('Bỏ nội dung chưa lưu trước khi rời trang?')){restoreRouteEvent=true;location.hash=activeDetailRoute;return;}draftDirty=false;activeDetailRoute=route();render();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&route().startsWith('detail:')){const cancel=$('#cancelCommentEdit')||$('#cancelEdit')||$('#close');cancel?.click();}});
render();
