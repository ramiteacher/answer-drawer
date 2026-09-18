// 데이터 흐름의 단일 진입점: 로그아웃 상태는 이 브라우저(localStorage / chrome.storage) 로컬 모드,
// 로그인 상태는 Google 계정(Firestore) 동기화 모드. 화면은 이 훅이 주는 data/commit 만 쓴다.
//
// 자기 쓰기 echo 방지: 우리 쓰기가 서버에 확인되기 전(pending>0)에 오는 스냅샷은 마지막 것만 보관했다가
// 쓰기가 끝난 뒤 적용한다. Firestore 의 로컬 뷰는 항상 "서버 상태 + 내 로컬 쓰기" 이므로 그 시점의
// 마지막 스냅샷이 곧 최신 상태다. 실패(권한 등) 시 SDK 가 되돌린 스냅샷을 적용해 화면도 되돌린다.
import {useCallback,useEffect,useRef,useState} from "react";
import {initialState,type DrawerState} from "../lib/model";
import {blankState,isExtension,keepAsPrevious,loadData,loadPrevious,markMigrated,observeData,readMigratedUid,replaceData,restorePrevious,saveData,validateData} from "../lib/storage";
import {firebaseEnabled} from "../lib/firebase";
import {authErrorMessage,observeAccount,signInWithGoogle,signOutAccount,type Account} from "../lib/auth";
import {applyOps,cloudExists,initializeCloud,subscribeCloud,type CloudSnapshot} from "../lib/cloud";
import {computeCloudDiff,emptyOrders,planFirstSync,sameState,type CloudOp,type OrderMap} from "../lib/cloud-model";

export type SyncStatus="local"|"connecting"|"syncing"|"synced"|"offline"|"error";
export const statusLabel:Record<SyncStatus,string>={local:"내 브라우저에 저장",connecting:"계정 데이터 불러오는 중…",syncing:"동기화 중…",synced:"동기화 완료",offline:"오프라인 · 연결되면 자동 동기화",error:"동기화 오류"};
type Session={uid:string;alive:boolean;subscribed:boolean;initChecked:boolean;sawServer:boolean;lastFromCache:boolean;orders:OrderMap;latest:DrawerState;pending:number;deferred:CloudSnapshot|null;failed:DrawerState|null;off:()=>void;timer:ReturnType<typeof setTimeout>|null;retryTimer:ReturnType<typeof setTimeout>|null};
const online=()=>typeof navigator==="undefined"||navigator.onLine!==false;
const PERMISSION="permission-denied";
// 프리캔버스 Firestore 규칙(2026-09-18)이 answerDrawer 쓰기를 베이직 플랜 이상(plan 클레임)으로 막는다 — 쓰기 거부는 요금제 안내로 보여 준다.
export const PLAN_MESSAGE="CS 답변서랍의 계정 동기화는 프리캔버스 베이직 플랜 이상에서 쓸 수 있어요. 구독 전에는 이 브라우저에만 저장돼요. 구독 후에는 다시 로그인해 주세요. (freecanvas.ai.kr)";

export function useDrawer(notify:(message:string)=>void){
 const[account,setAccount]=useState<Account|null>(null);const[authReady,setAuthReady]=useState(!firebaseEnabled);
 const[data,setData]=useState<DrawerState>(initialState);const[ready,setReady]=useState(false);const[startError,setStartError]=useState("");
 const[status,setStatus]=useState<SyncStatus>("local");const[syncError,setSyncError]=useState("");const[busy,setBusy]=useState(false);
 const session=useRef<Session|null>(null);const writing=useRef(false);const notifyRef=useRef(notify);notifyRef.current=notify;
 const uid=account?.uid??null;

 useEffect(()=>observeAccount(next=>{setAccount(prev=>prev&&next&&prev.uid===next.uid&&prev.email===next.email&&prev.photo===next.photo?prev:next);setAuthReady(true);},message=>notifyRef.current(message)),[]);

 function updateStatus(current:Session,fromCache:boolean){
  current.lastFromCache=fromCache;
  if(!online()){setStatus("offline");return;}
  if(current.pending>0){setStatus("syncing");return;}
  if(fromCache){setStatus(current.sawServer?"syncing":"connecting");if(current.timer)clearTimeout(current.timer);current.timer=setTimeout(()=>{if(current.alive&&current.lastFromCache)setStatus("offline");},12000);return;}
  if(current.timer){clearTimeout(current.timer);current.timer=null;}
  setStatus("synced");
 }
 function adopt(current:Session,snap:CloudSnapshot){
  current.orders=snap.orders;
  if(!sameState(current.latest,snap.state)){current.latest=snap.state;setData(snap.state);}
  if(!snap.fromCache)current.sawServer=true;
  setReady(true);updateStatus(current,snap.fromCache);
 }
 function subscribe(current:Session,attempt=0){
  if(current.subscribed)return;current.subscribed=true;
  current.off=subscribeCloud(current.uid,snap=>{
   if(!current.alive)return;
   if(current.pending>0){current.deferred=snap;setStatus(online()?"syncing":"offline");return;}
   const empty=snap.orders.stores.size===0&&snap.orders.replies.size===0;
   if(empty&&snap.fromCache&&!current.sawServer){current.deferred=snap;if(!current.timer)current.timer=setTimeout(()=>{if(current.alive&&current.deferred&&current.pending===0){const last=current.deferred;current.deferred=null;adopt(current,last);}},6000);return;}
   current.deferred=null;adopt(current,snap);
  },err=>{
   if(!current.alive)return;
   current.off();current.subscribed=false;
   // 탭이 여러 개 열려 있으면(멀티탭 캐시) 로그인·로그아웃 직후 탭 간 인증 상태가 잠깐 어긋나 permission-denied 가 날 수 있다 — 잠시 뒤 다시 구독한다.
   if(err.code===PERMISSION&&attempt<3){current.retryTimer=setTimeout(()=>{if(current.alive)subscribe(current,attempt+1);},1500*(attempt+1));return;}
   setStatus("error");setSyncError(err.code===PERMISSION?"계정 데이터에 접근할 권한이 없어요. 다시 로그인해 주세요.":"동기화 연결에 문제가 있어요. 잠시 후 다시 시도해 주세요.");
  });
 }
 async function startCloud(current:Session){
  try{
   let local:DrawerState;try{local=await loadData();}catch{local=blankState();}
   if(!current.alive)return;
   let exists:boolean;
   try{exists=await cloudExists(current.uid);}
   catch{if(!current.alive)return;subscribe(current);setStatus("offline");return;}
   if(!current.alive)return;
   current.initChecked=true;
   const migratedTo=await readMigratedUid();
   const plan=planFirstSync({cloudExists:exists,local,migratedTo,uid:current.uid});
   if(plan.action==="upload"){
    const result=await initializeCloud(current.uid,plan.upload,isExtension()?"extension":"web");
    if(!current.alive)return;
    if(result==="created"&&plan.migrated)notifyRef.current("이 브라우저에 있던 답변을 Google 계정으로 옮겼어요.");
   }else if(plan.backupLocal){await keepAsPrevious(local);notifyRef.current("계정의 답변을 불러왔어요. 이 브라우저에 있던 답변은 이전 백업으로 보관했어요.");}
   if(migratedTo===null||migratedTo===current.uid)await markMigrated(current.uid);
   if(!current.alive)return;
   subscribe(current);
  }catch(err){
   if(!current.alive)return;
   const message=(err as {code?:string}).code===PERMISSION?PLAN_MESSAGE:"계정 데이터를 불러오지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.";
   setStatus("error");setSyncError(message);setStartError(message);
  }
 }

 useEffect(()=>{
  if(!authReady)return;
  setReady(false);setData(blankState());setStartError("");setSyncError("");
  if(!uid){
   let alive=true;setStatus("local");
   async function refresh(){try{const saved=await loadData();if(alive){setData(saved);setReady(true);setStartError("");}}catch{if(alive)setStartError("저장된 내용을 읽지 못했어요. 새로고침하거나 브라우저의 저장 공간 설정을 확인해 주세요. 기존 내용은 덮어쓰지 않았어요.");}}
   void refresh();const off=observeData(()=>void refresh());
   return()=>{alive=false;off();};
  }
  const current:Session={uid,alive:true,subscribed:false,initChecked:false,sawServer:false,lastFromCache:true,orders:emptyOrders(),latest:blankState(),pending:0,deferred:null,failed:null,off:()=>{},timer:null,retryTimer:null};
  session.current=current;setStatus("connecting");
  void startCloud(current);
  const wentOnline=()=>{if(!current.alive)return;if(!current.initChecked)void startCloud(current);else setStatus("syncing");};
  const wentOffline=()=>{if(current.alive)setStatus("offline");};
  window.addEventListener("online",wentOnline);window.addEventListener("offline",wentOffline);
  return()=>{current.alive=false;current.off();if(current.timer)clearTimeout(current.timer);if(current.retryTimer)clearTimeout(current.retryTimer);window.removeEventListener("online",wentOnline);window.removeEventListener("offline",wentOffline);if(session.current===current)session.current=null;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[authReady,uid]);

 function settle(current:Session){
  if(current.pending>0||!current.deferred)return;
  const last=current.deferred;current.deferred=null;adopt(current,last);
 }
 function push(current:Session,ops:CloudOp[],state:DrawerState){
  current.pending++;setSyncError("");setStatus(online()?"syncing":"offline");
  applyOps(current.uid,ops)
   .then(()=>{if(!current.alive)return;current.pending--;if(current.pending===0){setStatus("synced");settle(current);}})
   .catch(err=>{if(!current.alive)return;current.pending--;current.failed=state;setSyncError((err as {code?:string}).code===PERMISSION?PLAN_MESSAGE:"변경 내용을 계정에 저장하지 못했어요. 다시 시도해 주세요.");if(current.pending===0){if(current.deferred){const last=current.deferred;current.deferred=null;adopt(current,last);}setStatus("error");}});
 }

 const commit=useCallback(async(next:DrawerState,backup=false):Promise<boolean>=>{
  if(!ready){notifyRef.current("저장소 연결을 확인해 주세요.");return false;}
  if(writing.current)return false;writing.current=true;
  try{
   const current=session.current;
   if(!current){backup?await replaceData(next):await saveData(next);setData(next);return true;}
   const clean=validateData(next);
   if(backup)await keepAsPrevious(current.latest);
   const{ops,orders}=computeCloudDiff(current.latest,clean,current.orders);
   current.latest=clean;current.orders=orders;current.failed=null;setData(clean);
   if(ops.length)push(current,ops,clean);else if(current.pending===0&&online())setStatus("synced");
   return true;
  }catch(err){notifyRef.current(err instanceof Error?err.message:"저장하지 못했어요. 브라우저 저장 공간을 확인하고 다시 시도해 주세요.");return false;}
  finally{writing.current=false;}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ready]);

 const restore=useCallback(async():Promise<DrawerState|null>=>{
  try{
   if(!session.current){const next=await restorePrevious();setData(next);notifyRef.current("이전 백업을 복원했어요.");return next;}
   const previous=await loadPrevious();
   if(await commit(previous,true)){notifyRef.current("이전 백업을 복원했어요.");return previous;}
   return null;
  }catch(err){notifyRef.current(err instanceof Error?err.message:"백업을 복원하지 못했어요.");return null;}
 },[commit]);

 const signIn=useCallback(async()=>{if(!firebaseEnabled){notifyRef.current("로그인 설정이 없어요.");return;}setBusy(true);try{await signInWithGoogle();}catch(err){notifyRef.current(authErrorMessage(err));}finally{setBusy(false);}},[]);
 const signOut=useCallback(async()=>{try{await signOutAccount();notifyRef.current("로그아웃했어요. 이제 이 브라우저에만 저장돼요.");}catch{notifyRef.current("로그아웃하지 못했어요. 다시 시도해 주세요.");}},[]);
 const retry=useCallback(()=>{const current=session.current;if(!current)return;setSyncError("");if(current.failed){const failed=current.failed;current.failed=null;void commit(failed);}else if(!current.initChecked){setStatus("connecting");void startCloud(current);}else if(!current.subscribed){setStatus("connecting");subscribe(current);}else setStatus(online()?"syncing":"offline");
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[commit]);

 return{account,authReady,enabled:firebaseEnabled,cloud:Boolean(uid),data,ready,startError,status,syncError,busy,commit,restore,signIn,signOut,retry};
}
