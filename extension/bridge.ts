import {validateData} from "../lib/storage";
declare const chrome:{storage:{local:{get:(key:string)=>Promise<Record<string,unknown>>;set:(value:Record<string,unknown>)=>Promise<void>}}};
// The bridge never reads marketplace pages. Only the exact management page may write a snapshot.
const trusted=location.origin==="https://ramiteacher.github.io"&&location.pathname.startsWith("/answer-drawer/");
let saving=false;
if(trusted)window.addEventListener("message",async(event:MessageEvent)=>{
 if(event.source!==window||event.origin!==location.origin||event.data?.source!=="answer-drawer-web")return;
 function respond(value:Record<string,unknown>){window.postMessage({source:"answer-drawer-extension",...value},location.origin);}
 if(event.data.type==="HELLO"){respond({type:"READY"});return;}
 if(event.data.type!=="SAVE"||typeof event.data.requestId!=="string"||event.data.requestId.length>100)return;
 const requestId=event.data.requestId;
 if(saving){respond({type:"SAVED",requestId,ok:false});return;}saving=true;
 try{const envelope=event.data.data;if(envelope?.format!=="answer-drawer"||envelope.version!==1)throw new Error("Invalid backup");if(JSON.stringify(envelope).length>2_000_000)throw new Error("Too large");const data=validateData(envelope.data);const old=await chrome.storage.local.get("answer-drawer:v1");const update:Record<string,unknown>={"answer-drawer:v1":{format:"answer-drawer",version:1,data,exportedAt:new Date().toISOString()}};if(old["answer-drawer:v1"])update["answer-drawer:previous"]=old["answer-drawer:v1"];await chrome.storage.local.set(update);respond({type:"SAVED",requestId,ok:true});}catch{respond({type:"SAVED",requestId,ok:false});}finally{saving=false;}
});
