// Google 로그인. 웹은 팝업(막히면 리디렉션), 확장 사이드패널은 프리캔버스AI 보조 확장의
// offscreen 문서 → 웹의 auth.html(iframe) → 팝업 순서로 자격 증명을 받아 signInWithCredential 한다.
// 토큰은 직접 저장하지 않는다 — Firebase Auth 의 기본 persistence 에 맡긴다.
import {GoogleAuthProvider,getRedirectResult,onAuthStateChanged,signInWithCredential,signInWithPopup,signInWithRedirect,signOut,type Auth,type User} from "firebase/auth";
import {firebaseEnabled,getFirebaseAuth,googleProvider,useEmulator} from "./firebase";
import {isExtension} from "./storage";

export type Account={uid:string;email:string;name:string;photo:string};
export const toAccount=(user:User):Account=>({uid:user.uid,email:user.email??"",name:user.displayName??"",photo:user.photoURL??""});
export type ExtensionAuthResult={ok:true;idToken:string|null;accessToken:string|null}|{ok:false;error:string};

export function observeAccount(fn:(account:Account|null)=>void,onError?:(message:string)=>void):()=>void{
 if(!firebaseEnabled){fn(null);return()=>{};}
 const auth=getFirebaseAuth();
 if(!isExtension())getRedirectResult(auth).catch(err=>onError?.(authErrorMessage(err)));
 return onAuthStateChanged(auth,user=>fn(user?toAccount(user):null));
}

export async function signInWithGoogle():Promise<void>{
 const auth=getFirebaseAuth();
 if(isExtension()){await signInExtension(auth);return;}
 // 에뮬레이터 검증 환경(내장 브라우저)은 팝업을 같은 탭에 열어 relay 가 끊기므로 리디렉션 방식을 쓴다
 if(useEmulator){await signInWithRedirect(auth,googleProvider());return;}
 try{await signInWithPopup(auth,googleProvider());}
 catch(err){const code=(err as {code?:string}).code;if(code==="auth/popup-blocked"||code==="auth/operation-not-supported-in-this-environment"){await signInWithRedirect(auth,googleProvider());return;}throw err;}
}
export async function signOutAccount(){await signOut(getFirebaseAuth());}

type Runtime={sendMessage:(message:unknown)=>Promise<unknown>};
const runtime=()=>(globalThis as typeof globalThis&{chrome?:{runtime?:Runtime}}).chrome?.runtime;
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function signInExtension(auth:Auth){
 const api=runtime();if(!api)throw new Error("확장프로그램 환경이 아니에요.");
 const opened=await api.sendMessage({target:"background",type:"answer-drawer-auth-open"}) as {ok?:boolean;error?:string}|undefined;
 if(!opened?.ok)throw new Error(opened?.error||"로그인 창을 준비하지 못했어요. 확장프로그램을 새로고침해 주세요.");
 try{
  // offscreen 문서가 아직 리스너를 붙이기 전이면 응답이 없거나(undefined) 연결 오류가 난다 — 잠깐 기다렸다 다시 보낸다.
  let result:ExtensionAuthResult|undefined;
  for(let attempt=0;attempt<8&&!result;attempt++){
   try{result=await api.sendMessage({target:"offscreen",type:"answer-drawer-auth-run"}) as ExtensionAuthResult|undefined;}
   catch(err){if(attempt===7)throw err;}
   if(!result||typeof result!=="object")await wait(300);
  }
  if(!result||typeof result!=="object")throw new Error("로그인 창을 열지 못했어요. 확장프로그램을 새로고침한 뒤 다시 시도해 주세요.");
  if(!result.ok)throw new Error(result.error||"로그인하지 못했어요.");
  if(!result.idToken&&!result.accessToken)throw new Error("Google 인증 정보를 받지 못했어요.");
  await signInWithCredential(auth,GoogleAuthProvider.credential(result.idToken,result.accessToken??undefined));
 }finally{api.sendMessage({target:"background",type:"answer-drawer-auth-close"}).catch(()=>{});}
}

export function authErrorMessage(err:unknown):string{
 const code=(err as {code?:string})?.code??"";
 if(code==="auth/popup-closed-by-user"||code==="auth/cancelled-popup-request"||code==="auth/user-cancelled")return"로그인 창이 닫혔어요. 다시 시도해 주세요.";
 if(code==="auth/network-request-failed")return"네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
 if(code==="auth/unauthorized-domain")return"이 주소에서는 로그인이 허용되지 않았어요.";
 if(code==="auth/popup-blocked")return"팝업이 차단됐어요. 이 사이트의 팝업을 허용해 주세요.";
 if(err instanceof Error&&err.message&&!code)return err.message;
 return"로그인하지 못했어요. 잠시 후 다시 시도해 주세요.";
}
