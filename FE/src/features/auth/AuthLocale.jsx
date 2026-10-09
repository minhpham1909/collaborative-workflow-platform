import {Children,cloneElement,createContext,isValidElement,useContext,useState} from 'react';
import PasswordField from '../../components/PasswordField.jsx';
import EmailVerificationActions from '../../components/EmailVerificationActions.jsx';
import {translateAuthText} from './auth-translations.js';
const Context=createContext({locale:'vi',setLocale:()=>{}});
const key='workflow.auth.locale';
export function AuthLocaleProvider({children}){const [locale,setValue]=useState(()=>{try{return localStorage.getItem(key)==='en'?'en':'vi';}catch{return 'vi';}});function setLocale(value){if(!['vi','en'].includes(value))return;setValue(value);try{localStorage.setItem(key,value);}catch{}}return <Context.Provider value={{locale,setLocale}}>{children}</Context.Provider>;}
export const useAuthLocale=()=>useContext(Context);
// Translate presentation strings/labels only. Controlled values, IDs, callbacks,
// versions and authentication request bodies are left intact.
export function localizeAuth(node,locale){if(typeof node==='string')return translateAuthText(node,locale);if(!isValidElement(node)||node.props.translate==='no')return node;const props={};if(node.type===EmailVerificationActions)props.translate=value=>translateAuthText(value,locale);for(const key of ['label','hint','error','title','placeholder','aria-label'])if(typeof node.props[key]==='string')props[key]=translateAuthText(node.props[key],locale);if(node.type===PasswordField)props.visibilityLabels=locale==='en'?{show:'Show',hide:'Hide'}:{show:'Hiện',hide:'Ẩn'};const children=node.props.children;if(typeof children==='function')props.children=(...args)=>localizeAuth(children(...args),locale);else if(children!==undefined)props.children=Children.map(children,child=>localizeAuth(child,locale));return cloneElement(node,props);}
export function AuthLanguageSwitch({disabled=false}){const {locale,setLocale}=useAuthLocale();return <div className="auth-language" aria-label={locale==='en'?'Account interface language':'Ngôn ngữ giao diện tài khoản'}><button type="button" disabled={disabled} lang="vi" aria-pressed={locale==='vi'} onClick={()=>setLocale('vi')}>Tiếng Việt</button><button type="button" disabled={disabled} lang="en" aria-pressed={locale==='en'} onClick={()=>setLocale('en')}>English</button></div>;}
