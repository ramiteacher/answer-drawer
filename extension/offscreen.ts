// 프리캔버스AI 보조 확장의 offscreen 문서(answer-drawer/offscreen.html).
// 웹의 로그인 도우미(auth.html)를 iframe 으로 열고, 사이드패널의 요청을 받아 Google 팝업 로그인 결과
// (OAuth idToken/accessToken)만 돌려준다. 토큰을 저장하지 않으며, 메시지는 도우미 origin 과 iframe 창에서 온 것만 받는다.
import {AUTH_HELPER_URL} from "../lib/extension-id";

type AuthResult={ok:true;idToken:string|null;accessToken:string|null}|{ok:false;error:string};
const helperOrigin=new URL(AUTH_HELPER_URL).origin;
const iframe=document.createElement("iframe");
let loaded=false;const waiting:(()=>void)[]=[];
iframe.addEventListener("load",()=>{loaded=true;for(const resolve of waiting.splice(0))resolve();});
iframe.src=AUTH_HELPER_URL;
document.body.appendChild(iframe);
const whenLoaded=()=>loaded?Promise.resolve():new Promise<void>(resolve=>{waiting.push(resolve);});
let active=false;

chrome.runtime.onMessage.addListener((message:{target?:string;type?:string}|undefined,_sender,sendResponse:(response:AuthResult)=>void)=>{
 if(!message||message.target!=="offscreen"||message.type!=="answer-drawer-auth-run")return false;
 if(active){sendResponse({ok:false,error:"이미 로그인 창이 열려 있어요."});return false;}
 active=true;let done=false;
 const finish=(payload:AuthResult)=>{if(done)return;done=true;active=false;window.removeEventListener("message",onMessage);clearTimeout(timer);sendResponse(payload);};
 function onMessage(event:MessageEvent){
  if(event.origin!==helperOrigin||event.source!==iframe.contentWindow)return;
  const data=event.data as {type?:unknown;ok?:unknown;idToken?:unknown;accessToken?:unknown;error?:unknown}|null;
  if(!data||typeof data!=="object"||data.type!=="answer-drawer-auth-result")return;
  finish(data.ok===true?{ok:true,idToken:typeof data.idToken==="string"?data.idToken:null,accessToken:typeof data.accessToken==="string"?data.accessToken:null}:{ok:false,error:typeof data.error==="string"?data.error:"로그인하지 못했어요."});
 }
 const timer=setTimeout(()=>finish({ok:false,error:"로그인 시간이 지났어요. 다시 시도해 주세요."}),180000);
 window.addEventListener("message",onMessage);
 void whenLoaded().then(()=>iframe.contentWindow?.postMessage({type:"answer-drawer-init-auth"},helperOrigin));
 return true;
});
