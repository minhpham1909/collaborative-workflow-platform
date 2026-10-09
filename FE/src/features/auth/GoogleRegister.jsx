import {useEffect,useRef,useState} from 'react';
import {InlineMessage,LoadingState} from '../../components/Feedback.jsx';
import {confirmDialog} from '../../components/NotificationProvider.jsx';
import {loadGoogle} from '../../lib/google.js';
import {messageFor} from '../../lib/messages.js';
import {isUncertainMutation} from '../../lib/mutation-outcome.js';
import {localizeAuth,useAuthLocale} from './AuthLocale.jsx';
import {translateAuthText} from './auth-translations.js';
export default function GoogleRegister({api,caps,consent,hasDraft,onStart,onRunning,onSuccess,onUncertain,onCapsStale,disabled}) {
  const {locale}=useAuthLocale();const t=value=>translateAuthText(value,locale);
  const [active,setActive]=useState(false),[loading,setLoading]=useState(false),[writing,setWriting]=useState(false),[error,setError]=useState('');
  const target=useRef(null),pending=useRef(false),startPending=useRef(false),version=useRef(null);
  useEffect(()=>{
    if(!active)return;
    let live=true;setLoading(true);
    (async()=>{try {
      if(!caps?.googleClientId)throw {code:'GOOGLE_NOT_CONFIGURED'};
      await loadGoogle();if(!live)return;
      const challenge=await api.raw('/auth/google/challenge',{method:'POST',body:{}});if(!live)return;
      window.google.accounts.id.initialize({client_id:caps.googleClientId,nonce:challenge.nonce,auto_select:false,callback:async({credential})=>{
        if(!live||pending.current)return;pending.current=true;setWriting(true);setError('');
        try {const user=await api.google({credential,termsAccepted:true,termsVersion:version.current});if(live)onSuccess(user);}
        catch(error){if(live){setError(isUncertainMutation(error)?'Chưa xác nhận tạo tài khoản Google. Về đăng nhập để kiểm tra trước khi thử lại.':messageFor(error));if(isUncertainMutation(error))onUncertain();if(error.code==='TERMS_REQUIRED')onCapsStale?.();setActive(false);}}
        finally{pending.current=false;if(live){setWriting(false);onRunning(false);}}
      }});
      window.google.accounts.id.renderButton(target.current,{theme:'outline',size:'large',text:'signup_with',locale,width:Math.min(300,target.current.clientWidth||300)});
    }catch(error){if(live){setError(messageFor(error));setActive(false);onRunning(false);}}finally{if(live)setLoading(false);}})();
    return()=>{live=false;target.current?.replaceChildren();};
  },[active,api]);
  async function start(){if(startPending.current||pending.current||disabled||!consent||!caps?.termsVersion)return;startPending.current=true;try{if(hasDraft&&!await confirmDialog(t('Bỏ thông tin đăng ký email chưa gửi và tiếp tục bằng Google?'),{title:t('Chuyển sang Google'),confirmLabel:t('Tiếp tục bằng Google'),cancelLabel:t('Hủy')}))return;version.current=caps.termsVersion;onStart();onRunning(true);setError('');setActive(true);}finally{startPending.current=false;}}
  return localizeAuth(<section className="google-registration" aria-label="Đăng ký Google"><p>Hoặc tạo tài khoản bằng Google. Tài khoản mới không cần mật khẩu riêng; email được xác minh theo thông tin Google cung cấp.</p><button type="button" disabled={disabled||active||!consent||!caps?.termsVersion} onClick={start}>Tạo tài khoản bằng Google</button>{!consent&&<p className="muted">Đồng ý điều khoản phía trên để tiếp tục bằng Google.</p>}{loading&&<LoadingState>Đang chuẩn bị Google…</LoadingState>}{active&&<button type="button" disabled={writing} onClick={()=>{setActive(false);setLoading(false);onRunning(false);}}>Đóng chọn Google</button>}<div ref={target}/>{error&&<InlineMessage>{error}</InlineMessage>}</section>,locale);
}
