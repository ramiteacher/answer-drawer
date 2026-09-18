import {initialState,type DrawerState,storeFields,categories} from "./model";
const KEY="answer-drawer:v1"; const BACKUP="answer-drawer:previous";
type StorageArea={get:(key:string)=>Promise<Record<string,unknown>>;set:(items:Record<string,unknown>)=>Promise<void>};
type ExtensionApi={storage:{local:StorageArea;onChanged:{addListener:(fn:(changes:Record<string,unknown>,area:string)=>void)=>void;removeListener:(fn:(changes:Record<string,unknown>,area:string)=>void)=>void}}};
export function extensionApi():ExtensionApi|undefined{return (globalThis as typeof globalThis & {chrome?:ExtensionApi}).chrome?.storage?(globalThis as typeof globalThis & {chrome?:ExtensionApi}).chrome:undefined;}
export const isExtension=()=>typeof location!=="undefined"&&location.protocol==="chrome-extension:";
export const blankState=():DrawerState=>structuredClone(initialState);
export function validateData(value:unknown):DrawerState{
 if(!value||typeof value!=="object")throw new Error("답변서랍 백업 파일이 아니에요.");
 const data=value as DrawerState; if(!Array.isArray(data.stores)||data.stores.length<1||data.stores.length>100||!Array.isArray(data.replies)||data.replies.length>1000)throw new Error("스토어 또는 답변 목록을 확인해 주세요.");
 const ids=new Set<string>();
 function str(v:unknown,max:number,required=false){if(typeof v!=="string"||v.length>max||(required&&!v.trim()))throw new Error("백업에 잘못된 항목이 있어요.");return v;}
 const stores=data.stores.map(s=>{if(!s||typeof s!=="object")throw new Error("스토어 형식이 잘못됐어요.");const id=str(s.id,100,true);if(ids.has(id))throw new Error("중복된 스토어가 있어요.");ids.add(id);const clean={id,channel:str(s.channel,60,true)} as DrawerState["stores"][number];for(const f of storeFields)clean[f.key]=str(s[f.key],f.key==="name"?100:4000,f.key==="name");return clean;});
 ids.clear();const replies=data.replies.map(r=>{if(!r||typeof r!=="object")throw new Error("답변 형식이 잘못됐어요.");const id=str(r.id,100,true);if(ids.has(id))throw new Error("중복된 답변이 있어요.");ids.add(id);if(!categories.includes(r.category)||typeof r.favorite!=="boolean")throw new Error("답변 분류를 확인해 주세요.");return{id,title:str(r.title,100,true),body:str(r.body,12000,true),category:r.category,favorite:r.favorite};});
 const clean={stores,replies};if(new TextEncoder().encode(JSON.stringify(clean)).length>1_500_000)throw new Error("저장할 내용이 너무 많아요. 긴 답변이나 사용하지 않는 항목을 정리해 주세요.");return clean;
}
export function exportEnvelope(data:DrawerState){return{format:"answer-drawer",version:1,exportedAt:new Date().toISOString(),data};}
export function parseBackup(text:string){if(text.length>2_000_000)throw new Error("2MB 이하의 백업을 선택해 주세요.");const parsed=JSON.parse(text);if(parsed.format!=="answer-drawer"||parsed.version!==1)throw new Error("지원하지 않는 백업 파일이에요.");return validateData(parsed.data);}
async function read(key:string){if(isExtension()){const api=extensionApi();if(!api)throw new Error("확장프로그램 저장소를 사용할 수 없어요.");return(await api.storage.local.get(key))[key];}const item=localStorage.getItem(key);return item?JSON.parse(item):null;}
async function write(key:string,value:unknown){if(isExtension()){await extensionApi()!.storage.local.set({[key]:value});}else{localStorage.setItem(key,JSON.stringify(value));}}
export async function loadData(){const saved=await read(KEY);return saved?validateData((saved as {data:unknown}).data):blankState();}
export async function saveData(data:DrawerState){await write(KEY,exportEnvelope(validateData(data)));}
export async function replaceData(data:DrawerState){const previous=await read(KEY);if(previous)await write(BACKUP,previous);await saveData(data);}
export async function restorePrevious(){const saved=await read(BACKUP);if(!saved)throw new Error("이전에 보관한 백업이 없어요.");const result=validateData((saved as {data:unknown}).data);await replaceData(result);return result;}
export function observeData(fn:()=>void){if(isExtension()){const listener=(changes:Record<string,unknown>,area:string)=>{if(area==="local"&&KEY in changes)fn();};extensionApi()!.storage.onChanged.addListener(listener);return()=>extensionApi()!.storage.onChanged.removeListener(listener);}const listener=(event:StorageEvent)=>{if(event.key===KEY)fn();};window.addEventListener("storage",listener);return()=>window.removeEventListener("storage",listener);}
