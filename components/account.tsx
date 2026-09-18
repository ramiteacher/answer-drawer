import {ArrowUpRight,CircleAlert,Cloud,CloudOff,LogIn,LogOut,RefreshCw,UserRound} from "lucide-react";
import type {Account} from "../lib/auth";
import {EXTENSION_NAME,EXTENSION_STORE_URL,WEB_URL} from "../lib/extension-id";
import {isExtension} from "../lib/storage";
import {statusLabel,type SyncStatus} from "../hooks/use-drawer";
import {Modal} from "./drawer-dialogs";

export type AccountProps={account:Account|null;enabled:boolean;authReady:boolean;status:SyncStatus;syncError:string;busy:boolean;onSignIn:()=>void;onSignOut:()=>void;onRetry:()=>void};

export function Avatar({account,size=34}:{account:Account;size?:number}){const initial=(account.name||account.email||"?").trim().charAt(0).toUpperCase();return <span className="avatar" style={{width:size,height:size}}>{account.photo?<img src={account.photo} alt="" referrerPolicy="no-referrer"/>:initial}</span>}

export function SyncBadge({status,compact=false}:{status:SyncStatus;compact?:boolean}){
 const Icon=status==="error"?CircleAlert:status==="offline"?CloudOff:Cloud;
 return <span className={`sync-badge ${status}`} title={statusLabel[status]}><Icon size={13}/>{compact?statusLabel[status].split(" · ")[0]:statusLabel[status]}</span>
}

/** 사이드바(데스크톱)용 계정 카드 */
export function AccountCard({account,enabled,authReady,status,syncError,busy,onSignIn,onSignOut,onRetry}:AccountProps){
 if(!enabled)return null;
 if(!authReady)return <div className="account-card muted"><UserRound size={20}/><strong>계정 확인 중…</strong></div>;
 if(!account)return <div className="account-card"><LogIn size={20}/><strong>Google 계정으로 연결</strong><p>같은 계정으로 로그인하면 웹과 {EXTENSION_NAME} 확장에서 같은 답변을 써요.</p><button className="primary" disabled={busy} onClick={onSignIn}>{busy?"로그인 중…":"Google로 로그인"}</button></div>;
 return <div className="account-card signed"><div className="account-row"><Avatar account={account}/><div><strong>{account.name||account.email}</strong><small>{account.email}</small></div></div><SyncBadge status={status}/>{status==="error"&&syncError&&<p className="error-text">{syncError}</p>}<div className="account-actions">{status==="error"&&<button onClick={onRetry}><RefreshCw size={13}/>다시 시도</button>}<button onClick={onSignOut}><LogOut size={13}/>로그아웃</button></div></div>
}

/** 사이드패널·모바일용 계정 화면 */
export function AccountDialog(props:AccountProps&{onClose:()=>void}){
 const{account,enabled,authReady,status,syncError,busy,onSignIn,onSignOut,onRetry,onClose}=props;const extension=isExtension();
 return <Modal title="계정 · 동기화" onClose={onClose}>
  {!enabled&&<p className="modal-intro">이 빌드에는 로그인 설정이 없어요. 답변은 이 브라우저에만 저장돼요.</p>}
  {enabled&&!account&&<><p className="modal-intro">Google 계정으로 로그인하면 웹과 {EXTENSION_NAME} 확장프로그램이 같은 답변을 자동으로 주고받아요. 로그인 전에는 이 브라우저에만 저장돼요.</p><button className="primary account-dialog-button" disabled={busy||!authReady} onClick={onSignIn}><LogIn size={16}/>{busy?"로그인 중…":"Google로 로그인"}</button><p className="form-note">처음 로그인하면 이 브라우저에 있던 답변을 계정으로 옮겨요. 계정에 이미 답변이 있으면 계정 것을 불러오고, 여기 있던 답변은 이전 백업으로 보관해요.</p></>}
  {enabled&&account&&<><div className="account-row large"><Avatar account={account} size={44}/><div><strong>{account.name||account.email}</strong><small>{account.email}</small></div></div><SyncBadge status={status}/>{status==="error"&&syncError&&<p className="error-text" role="alert">{syncError}</p>}<p className="form-note">{extension?"웹사이트에서도 같은 Google 계정으로 로그인하면 자동으로 연결돼요.":`${EXTENSION_NAME} 확장프로그램에서도 같은 Google 계정으로 로그인하면 자동으로 연결돼요.`}</p><div className="backup-actions">{status==="error"&&<button className="secondary" onClick={onRetry}><RefreshCw size={15}/>다시 시도</button>}<button className="secondary" onClick={onSignOut}><LogOut size={15}/>로그아웃</button></div></>}
  <div className="modal-footer">{extension?<a className="text-button" target="_blank" rel="noreferrer" href={WEB_URL}>웹사이트 열기 <ArrowUpRight size={14}/></a>:<a className="text-button" target="_blank" rel="noreferrer" href={EXTENSION_STORE_URL}>{EXTENSION_NAME} 설치 <ArrowUpRight size={14}/></a>}<button className="secondary push-right" onClick={onClose}>닫기</button></div>
 </Modal>
}

/** 로그인 전 첫 화면 안내 배너 */
export function LoginNote({busy,onSignIn}:{busy:boolean;onSignIn:()=>void}){
 return <div className="login-note"><span className="note-icon"><Cloud size={18}/></span><div><strong>Google로 로그인하면 웹과 확장프로그램이 자동으로 연결돼요.</strong><span>같은 계정으로 어디서든 같은 답변을 꺼내 쓰세요.</span></div><button className="primary" disabled={busy} onClick={onSignIn}>{busy?"로그인 중…":"Google로 로그인"}</button></div>
}
