import { InlineMessage, LoadingState } from '../../components/Feedback.jsx';
import EmailVerificationActions from '../../components/EmailVerificationActions.jsx';
import Icon from '../../components/Icon.jsx';
import Avatar from '../../components/Avatar.jsx';
import { useEffect, useRef, useState } from 'react';
import { messageFor } from '../../lib/messages.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import { invitationEndpoint } from '../../lib/auth-links.js';
import { useDraftGuard } from '../../lib/draft-navigation.js';
import './invite.css';
const terminal = ['INVITATION_UNAVAILABLE','RESOURCE_UNAVAILABLE','WORKSPACE_ARCHIVED','PROJECT_ARCHIVED','ACCESS_BANNED'];
export default function Invite({ api, token, user, onAccepted, kind='invite', authPanel, onSwitchAccount, accountBusy=false }) {
  const endpoint=invitationEndpoint(kind),org=kind==='organization-invite',guest=kind==='project-invite';
  const label=org?'tổ chức':guest?'Project với quyền Guest':'Workspace';
  const [preview,setPreview]=useState(null),[error,setError]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(true),[uncertain,setUncertain]=useState(false),[revision,setRevision]=useState(0),[accepted,setAccepted]=useState(null);
  const pending=useRef(false),identity=useRef(''),delivered=useRef(false);
  useDraftGuard({dirty:false,busy:busy&&pending.current,message:'Lời mời đang được xử lý.'});
  useEffect(()=>{if(accepted&&!busy&&!delivered.current){delivered.current=true;onAccepted(accepted);}},[accepted,busy,onAccepted]);
  useEffect(()=>{
    let live=true;
    const current=endpoint+'|'+token+'|'+(user?.id??'public');
    if(identity.current!==current){setUncertain(false);setAccepted(null);delivered.current=false;identity.current=current;}
    setPreview(null);setError('');setCode('');setBusy(true);
    if(!token){setBusy(false);setCode('MISSING_TOKEN');setError('Mở lại liên kết lời mời gốc để tiếp tục. Liên kết không được lưu trong trình duyệt.');return;}
    api.raw(endpoint+'/preview',{method:'POST',body:{token}}).then(value=>{if(live)setPreview(value.preview);}).catch(error=>{if(live){setError(messageFor(error));setCode(error.code??'NETWORK_ERROR');}}).finally(()=>{if(live)setBusy(false);});
    return()=>{live=false;};
  },[token,endpoint,revision,user?.id]);
  async function accept(){
    if(pending.current||busy||uncertain||!preview||!user?.emailVerified||!token)return;
    pending.current=true;setBusy(true);setError('');setCode('');
    try{setAccepted(await api.request(endpoint+'/accept',{method:'POST',body:{token}}));}
    catch(error){setError(isUncertainMutation(error)?'Chưa xác nhận gia nhập. Kiểm tra Trang chủ hoặc Dự án được chia sẻ trước khi thử lại.':messageFor(error));setCode(error.code??'NETWORK_ERROR');setUncertain(isUncertainMutation(error));if(terminal.includes(error.code))setPreview(null);}
    finally{pending.current=false;setBusy(false);}
  }
  const name=preview?.organizationName??preview?.projectName??preview?.workspaceName;
  const expired=code==='INVITATION_UNAVAILABLE',blocked=terminal.includes(code);
  return <main className={'studio-invite '+(!user?'public-invite':'member-invite')}>
    {!user&&<a className="invite-brand" href="#home"><img src="/brand/workflow-logo.svg" alt=""/>Workflow</a>}
    <section className="invite-hero"><span className="invite-symbol" aria-hidden="true"><Icon name={org?'layers':guest?'eye':'people'}/></span><div><p className="eyebrow">CÙNG NHAU LÀM VIỆC</p><h1>{'Lời mời tham gia '+label}</h1><p>{org?'Kết nối với tổ chức và những Workspace được cấp cho bạn.':guest?'Xem tiến độ và góp ý cho nhóm trong phạm vi Project.':'Một không gian chung để cùng thực hiện công việc.'}</p></div></section>
    <ol className="invite-steps" aria-label="Các bước tham gia"><li className={preview?'is-ready':''}>1. Xem lời mời</li><li className={user?.emailVerified?'is-ready':''}>2. Tài khoản xác minh</li><li>3. Tham gia</li></ol>
    <div className="invite-layout"><section className="invite-card" aria-label="Thông tin lời mời">
      {busy&&<LoadingState>Đang xử lý lời mời…</LoadingState>}
      {error&&<InlineMessage><span>{error}</span></InlineMessage>}
      {!preview&&!busy&&<div className="invite-unavailable"><Icon name="archive"/><h2>{code==='MISSING_TOKEN'?'Cần mở liên kết gốc':expired?'Lời mời không còn khả dụng':blocked?'Chưa thể tham gia':'Chưa tải được lời mời'}</h2><p>{expired?'Lời mời có thể đã hết hạn, bị thu hồi hoặc được sử dụng. Nếu đã tham gia, kiểm tra không gian của bạn; nếu chưa, nhờ người quản lý gửi lời mời mới.':code==='MISSING_TOKEN'?'Mở lại liên kết từ email hoặc người đã gửi lời mời.':blocked?'Kiểm tra quyền truy cập hoặc liên hệ người quản lý trước khi tiếp tục.':'Kiểm tra kết nối và tải lại để tiếp tục.'}</p>{token&&!blocked&&<button disabled={busy} onClick={()=>setRevision(value=>value+1)}>Tải lại lời mời</button>}</div>}
      {preview&&<><div className="invite-scope-label"><Icon name={org?'layers':guest?'document':'folder'}/>{org?'Tổ chức':guest?'Project':'Workspace'}<span>{guest?'Guest · Xem và bình luận':'Member · Thành viên'}</span></div><h2>{name}</h2><p className="invite-sender">{preview.inviterDisplayName} mời bạn tham gia.</p>{kind!=='invite'&&preview.workspaceName&&<p className="invite-parent"><Icon name="folder"/>Workspace: {preview.workspaceName}</p>}
        <div className="invite-rights"><h3>Quyền khi tham gia</h3><p>{guest?'Quyền Guest: chỉ xem và bình luận trong Project này; không nhận hoặc sửa Task.':org?'Vai trò Member. '+(preview.workspaceName?'Bạn sẽ được thêm vào Workspace trên sau khi chấp nhận.':'Workspace sẽ được người quản lý phân bổ sau.'):'Tham gia Workspace với vai trò thành viên để cộng tác và nhận công việc. Lời mời không cấp quyền quản trị.'}</p>{guest&&<p>Bạn không trở thành thành viên của toàn Workspace hoặc tổ chức.</p>}</div>
        <p className="invite-expiry"><Icon name="calendar"/>Hết hạn <time dateTime={preview.expiresAt}>{new Date(preview.expiresAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</time> · Giờ Việt Nam</p>
        {user?<section className="invite-account"><div className="invite-account-heading"><Avatar user={user}/><div><strong>{user.displayName}</strong><p>Tham gia bằng tài khoản {user.email}.</p></div></div>{onSwitchAccount&&<button className="invite-switch" disabled={busy||accountBusy} onClick={onSwitchAccount}>Đổi tài khoản</button>}{user.emailVerified?<><p>Nếu lời mời được gửi riêng bằng email, hãy dùng đúng email được mời.</p><button className="primary invite-accept" disabled={busy||uncertain||accountBusy} onClick={accept}>{busy?'Đang xử lý…':guest?'Chấp nhận quyền Guest':'Tham gia '+label}</button></>:<><h3>Xác minh email để tham gia</h3><p>Bạn cần xác minh email. Sau khi xác minh, tải lại thông tin tài khoản hoặc mở lại lời mời.</p><div className="invite-verify-actions"><EmailVerificationActions api={api}/></div></>}</section>:<div className="invite-auth-hint"><h3>Đăng nhập để tiếp tục</h3><p>Đăng nhập hoặc tạo tài khoản để tiếp tục. Lời mời chưa được chấp nhận.</p></div>}
      </>}
      <nav className="invite-exit" aria-label="Kiểm tra không gian đã tham gia"><a href="#home">Về Trang chủ</a><a href="#shared">Dự án được chia sẻ</a></nav>
    </section>{!user&&preview&&<aside className="invite-auth-panel" aria-label="Tài khoản để chấp nhận lời mời">{authPanel}</aside>}</div>
    <p className="invite-footnote">Lời mời chỉ được chấp nhận khi bạn chọn tham gia. Nếu tải lại trang, hãy mở lại liên kết lời mời gốc.</p>
  </main>;
}
