// 프리캔버스AI 보조 확장프로그램의 로그인 도우미 페이지 (auth.html).
// 확장의 offscreen 문서가 이 페이지를 iframe 으로 열고 {type:"answer-drawer-init-auth"} 를 보내면
// Google 팝업 로그인을 진행해 OAuth 자격 증명(idToken/accessToken)만 부모 프레임에 돌려준다.
// 허용된 확장 origin(고정 ID)에서 온 요청에만 응답하며, 응답 대상 origin 도 그 값으로 고정한다.
import {GoogleAuthProvider,signInWithPopup,signOut} from "firebase/auth";
import {authErrorMessage} from "../lib/auth";
import {EXTENSION_ORIGIN} from "../lib/extension-id";
import {firebaseEnabled,getFirebaseAuth,googleProvider} from "../lib/firebase";

const ALLOWED=new Set([EXTENSION_ORIGIN]);
const status=document.getElementById("status");
const say=(text:string)=>{if(status)status.textContent=text;};
let running=false;

if(window.parent===window){say("이 페이지는 프리캔버스AI 보조 확장프로그램의 로그인 도우미예요. 답변서랍은 상위 주소에서 열어 주세요.");}
else if(!firebaseEnabled){say("로그인 설정이 없어요.");}
else window.addEventListener("message",async(event:MessageEvent)=>{
 const data=event.data as {type?:unknown}|null;
 if(!data||typeof data!=="object"||data.type!=="answer-drawer-init-auth")return;
 if(!ALLOWED.has(event.origin)||event.source!==window.parent)return;
 const ancestors=location.ancestorOrigins;if(ancestors&&ancestors.length>0&&ancestors[0]!==event.origin)return;
 const reply=(payload:Record<string,unknown>)=>window.parent.postMessage({type:"answer-drawer-auth-result",...payload},event.origin);
 if(running){reply({ok:false,error:"이미 로그인 창이 열려 있어요."});return;}
 running=true;say("Google 로그인 창을 여는 중이에요…");
 try{
  const auth=getFirebaseAuth();
  const result=await signInWithPopup(auth,googleProvider());
  const credential=GoogleAuthProvider.credentialFromResult(result);
  if(!credential)throw new Error("Google 인증 정보를 받지 못했어요.");
  reply({ok:true,idToken:credential.idToken??null,accessToken:credential.accessToken??null});
  say("로그인 정보를 확장프로그램에 전달했어요. 이 창은 닫아도 돼요.");
  await signOut(auth).catch(()=>{});
 }catch(err){reply({ok:false,error:authErrorMessage(err)});say("로그인하지 못했어요.");}
 finally{running=false;}
});
