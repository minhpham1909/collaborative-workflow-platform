import useLiveRefresh from '../../lib/useLiveRefresh.js';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workflowText } from '../../lib/workflow-text.js';
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
  const { locale } = useAuthLocale();
  const tr = (value, values) => workflowText(value, locale, values);
  const endpoint=invitationEndpoint(kind),org=kind==='organization-invite',guest=kind==='project-invite';
  const label=org?tr("tổ chức"):guest?tr("Project với quyền Guest"):'Workspace';
  const [preview,setPreview]=useState(null),[error,setError]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(true),[uncertain,setUncertain]=useState(false),[revision,setRevision]=useState(0),[accepted,setAccepted]=useState(null);
  useLiveRefresh(() => setRevision(value => value + 1));
  const pending=useRef(false),identity=useRef(''),delivered=useRef(false);
  useDraftGuard({dirty:false,busy:busy&&pending.current,message:tr("Lời mời đang được xử lý.")});
  useEffect(()=>{if(accepted&&!busy&&!delivered.current){delivered.current=true;onAccepted(accepted);}},[accepted,busy,onAccepted]);
  useEffect(()=>{
    let live=true;
    const current=endpoint+'|'+token+'|'+(user?.id??'public');
    if(identity.current!==current){setUncertain(false);setAccepted(null);delivered.current=false;identity.current=current;}
    setPreview(null);setError('');setCode('');setBusy(true);
    if(!token){setBusy(false);setCode('MISSING_TOKEN');setError(tr("Mở lại liên kết lời mời gốc để tiếp tục. Liên kết không được lưu trong trình duyệt."));return;}
    api.raw(endpoint+'/preview',{method:'POST',body:{token}}).then(value=>{if(live)setPreview(value.preview);}).catch(error=>{if(live){setError(messageFor(error));setCode(error.code??'NETWORK_ERROR');}}).finally(()=>{if(live)setBusy(false);});
    return()=>{live=false;};
  },[token,endpoint,revision,user?.id]);
  async function accept(){
    if(pending.current||busy||uncertain||!preview||!user?.emailVerified||!token)return;
    pending.current=true;setBusy(true);setError('');setCode('');
    try{setAccepted(await api.request(endpoint+'/accept',{method:'POST',body:{token}}));}
    catch(error){setError(isUncertainMutation(error)?tr("Chưa xác nhận gia nhập. Kiểm tra Trang chủ hoặc Dự án được chia sẻ trước khi thử lại."):messageFor(error));setCode(error.code??'NETWORK_ERROR');setUncertain(isUncertainMutation(error));if(terminal.includes(error.code))setPreview(null);}
    finally{pending.current=false;setBusy(false);}
  }
  const name=preview?.organizationName??preview?.projectName??preview?.workspaceName;
  const expired=code==='INVITATION_UNAVAILABLE',blocked=terminal.includes(code);
  return <main className={'studio-invite '+(!user?'public-invite':'member-invite')}>
    {!user&&<a className="invite-brand" href="#home"><img src="/brand/workflow-logo.svg" alt=""/>Workflow</a>}
    <section className="invite-hero"><span className="invite-symbol" aria-hidden="true"><Icon name={org?'layers':guest?'eye':'people'}/></span><div><p className="eyebrow">{tr("CÙNG NHAU LÀM VIỆC")}</p><h1>{tr("Lời mời tham gia ")+label}</h1><p>{org?tr("Kết nối với tổ chức và những Workspace được cấp cho bạn."):guest?tr("Xem tiến độ và góp ý cho nhóm trong phạm vi Project."):tr("Một không gian chung để cùng thực hiện công việc.")}</p></div></section>
    <ol className="invite-steps" aria-label={tr("Các bước tham gia")}><li className={preview?'is-ready':''}>{tr("1. Xem lời mời")}</li><li className={user?.emailVerified?'is-ready':''}>{tr("2. Tài khoản xác minh")}</li><li>{tr("3. Tham gia")}</li></ol>
    <div className="invite-layout"><section className="invite-card" aria-label={tr("Thông tin lời mời")}>
      {busy&&<LoadingState>{tr("Đang xử lý lời mời…")}</LoadingState>}
      {error&&<InlineMessage><span>{tr(error)}</span></InlineMessage>}
      {!preview&&!busy&&<div className="invite-unavailable"><Icon name="archive"/><h2>{code==='MISSING_TOKEN'?tr("Cần mở liên kết gốc"):expired?tr("Lời mời không còn khả dụng"):blocked?tr("Chưa thể tham gia"):tr("Chưa tải được lời mời")}</h2><p>{expired?tr("Lời mời có thể đã hết hạn, bị thu hồi hoặc được sử dụng. Nếu đã tham gia, kiểm tra không gian của bạn; nếu chưa, nhờ người quản lý gửi lời mời mới."):code==='MISSING_TOKEN'?tr("Mở lại liên kết từ email hoặc người đã gửi lời mời."):blocked?tr("Kiểm tra quyền truy cập hoặc liên hệ người quản lý trước khi tiếp tục."):tr("Kiểm tra kết nối và tải lại để tiếp tục.")}</p>{token&&!blocked&&<button disabled={busy} onClick={()=>setRevision(value=>value+1)}>{tr("Tải lại lời mời")}</button>}</div>}
      {preview&&<><div className="invite-scope-label"><Icon name={org?'layers':guest?'document':'folder'}/>{org?tr("Tổ chức"):guest?'Project':'Workspace'}<span>{guest?tr("Guest · Xem và bình luận"):tr("Member · Thành viên")}</span></div><h2>{name}</h2><p className="invite-sender">{tr("{name} mời bạn tham gia.", { name: preview.inviterDisplayName })}</p>{kind!=='invite'&&preview.workspaceName&&<p className="invite-parent"><Icon name="folder"/>Workspace: {preview.workspaceName}</p>}
        <div className="invite-rights"><h3>{tr("Quyền khi tham gia")}</h3><p>{guest?tr("Quyền Guest: chỉ xem và bình luận trong Project này; không nhận hoặc sửa Task."):org?tr("Vai trò Member. ")+(preview.workspaceName?tr("Bạn sẽ được thêm vào Workspace trên sau khi chấp nhận."):tr("Workspace sẽ được người quản lý phân bổ sau.")):tr("Tham gia Workspace với vai trò thành viên để cộng tác và nhận công việc. Lời mời không cấp quyền quản trị.")}</p>{guest&&<p>{tr("Bạn không trở thành thành viên của toàn Workspace hoặc tổ chức.")}</p>}</div>
        <p className="invite-expiry"><Icon name="calendar"/>{tr("Hết hạn")}<time dateTime={preview.expiresAt}>{new Date(preview.expiresAt).toLocaleString(locale === "en" ? "en-GB" : "vi-VN",{timeZone:'Asia/Ho_Chi_Minh'})}</time>{tr("· Giờ Việt Nam")}</p>
        {user?<section className="invite-account"><div className="invite-account-heading"><Avatar user={user}/><div><strong>{user.displayName}</strong><p>{tr("Tham gia bằng tài khoản {email}.", { email: user.email })}</p></div></div>{onSwitchAccount&&<button className="invite-switch" disabled={busy||accountBusy} onClick={onSwitchAccount}>{tr("Đổi tài khoản")}</button>}{user.emailVerified?<><p>{tr("Nếu lời mời được gửi riêng bằng email, hãy dùng đúng email được mời.")}</p><button className="primary invite-accept" disabled={busy||uncertain||accountBusy} onClick={accept}>{busy?tr("Đang xử lý…"):guest?tr("Chấp nhận quyền Guest"):tr("Tham gia ")+label}</button></>:<><h3>{tr("Xác minh email để tham gia")}</h3><p>{tr("Bạn cần xác minh email. Sau khi xác minh, tải lại thông tin tài khoản hoặc mở lại lời mời.")}</p><div className="invite-verify-actions"><EmailVerificationActions api={api}/></div></>}</section>:<div className="invite-auth-hint"><h3>{tr("Đăng nhập để tiếp tục")}</h3><p>{tr("Đăng nhập hoặc tạo tài khoản để tiếp tục. Lời mời chưa được chấp nhận.")}</p></div>}
      </>}
      <nav className="invite-exit" aria-label={tr("Kiểm tra không gian đã tham gia")}><a href="#home">{tr("Về Trang chủ")}</a><a href="#shared">{tr("Dự án được chia sẻ")}</a></nav>
    </section>{!user&&preview&&<aside className="invite-auth-panel" aria-label={tr("Tài khoản để chấp nhận lời mời")}>{authPanel}</aside>}</div>
    <p className="invite-footnote">{tr("Lời mời chỉ được chấp nhận khi bạn chọn tham gia. Nếu tải lại trang, hãy mở lại liên kết lời mời gốc.")}</p>
  </main>;
}
