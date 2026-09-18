// Firestore 동기화의 순수 로직 — firebase 를 import 하지 않는다 (node 테스트에서 그대로 실행).
// 문서 구조: answerDrawer/{uid}(메타) · answerDrawer/{uid}/stores/{id} · answerDrawer/{uid}/replies/{id}
// 배열 순서는 각 문서의 order(숫자)로 보존한다. 앞에 끼우면 min-1, 뒤에 붙이면 max+1 을 준다.
import {categories,initialState,storeFields,type DrawerState,type SellerStore,type Reply} from "./model";

export type OrderMap={stores:Map<string,number>;replies:Map<string,number>};
export type CloudDoc={id:string;data:Record<string,unknown>};
export type CloudOp={collection:"stores"|"replies";id:string;type:"set";data:Record<string,unknown>}|{collection:"stores"|"replies";id:string;type:"delete"};
export const storeDocKeys=["name","channel","address","exchangeFee","returnFee","shipping","returns","size","order","updatedAt"] as const;
export const replyDocKeys=["title","category","body","favorite","order","updatedAt"] as const;
export const emptyOrders=():OrderMap=>({stores:new Map(),replies:new Map()});

function str(value:unknown,max:number){return typeof value==="string"?value.slice(0,max):"";}
function num(value:unknown){return typeof value==="number"&&Number.isFinite(value)?value:Number.MAX_SAFE_INTEGER;}

/** Firestore 문서 목록 → DrawerState. 손상된 문서는 건너뛰고 예외를 던지지 않는다. 스토어가 하나도 없으면 기본 스토어를 넣는다. */
export function buildStateFromDocs(stores:CloudDoc[],replies:CloudDoc[]):{state:DrawerState;orders:OrderMap}{
 const orders=emptyOrders();
 const storeList=stores.filter(d=>d.id.length<=100&&typeof d.data.name==="string"&&d.data.name.trim()).map(d=>({doc:d,order:num(d.data.order)})).sort((a,b)=>a.order-b.order||a.doc.id.localeCompare(b.doc.id)).slice(0,100).map(({doc,order})=>{orders.stores.set(doc.id,order);const store={id:doc.id,channel:str(doc.data.channel,60)||"기타"} as SellerStore;for(const f of storeFields)store[f.key]=str(doc.data[f.key],f.key==="name"?100:4000);return store;});
 const replyList=replies.filter(d=>d.id.length<=100&&typeof d.data.title==="string"&&d.data.title.trim()&&typeof d.data.body==="string"&&d.data.body.trim()).map(d=>({doc:d,order:num(d.data.order)})).sort((a,b)=>a.order-b.order||a.doc.id.localeCompare(b.doc.id)).slice(0,1000).map(({doc,order}):Reply=>{orders.replies.set(doc.id,order);const category=typeof doc.data.category==="string"&&categories.includes(doc.data.category)?doc.data.category:categories[categories.length-1];return{id:doc.id,title:str(doc.data.title,100),body:str(doc.data.body,12000),category,favorite:doc.data.favorite===true};});
 return{state:{stores:storeList.length?storeList:structuredClone(initialState.stores),replies:replyList},orders};
}

/** 배열 순서에 맞는 order 값을 정한다. 이미 순서가 맞는 항목은 값을 유지하고, 새 항목·어긋난 항목만 새 값을 받는다. */
export function assignOrders(ids:string[],existing:Map<string,number>):Map<string,number>{
 const result=new Map<string,number>();let last=-Infinity;
 for(let i=0;i<ids.length;i++){
  const id=ids[i];const current=existing.get(id);
  if(current!==undefined&&current>last){result.set(id,current);last=current;continue;}
  let next:number|undefined;for(let j=i+1;j<ids.length;j++){const candidate=existing.get(ids[j]);if(candidate!==undefined&&candidate>last){next=candidate;break;}}
  const value=last===-Infinity?(next===undefined?0:next-1):next===undefined?last+1:(last+next)/2;
  result.set(id,value);last=value;
 }
 return result;
}

export const storeToDoc=(store:SellerStore,order:number):Record<string,unknown>=>({name:store.name,channel:store.channel,address:store.address,exchangeFee:store.exchangeFee,returnFee:store.returnFee,shipping:store.shipping,returns:store.returns,size:store.size,order});
export const replyToDoc=(reply:Reply,order:number):Record<string,unknown>=>({title:reply.title,category:reply.category,body:reply.body,favorite:reply.favorite,order});
const sameStore=(a:SellerStore,b:SellerStore)=>a.name===b.name&&a.channel===b.channel&&a.address===b.address&&a.exchangeFee===b.exchangeFee&&a.returnFee===b.returnFee&&a.shipping===b.shipping&&a.returns===b.returns&&a.size===b.size;
const sameReply=(a:Reply,b:Reply)=>a.title===b.title&&a.category===b.category&&a.body===b.body&&a.favorite===b.favorite;
export function sameState(a:DrawerState,b:DrawerState){return a.stores.length===b.stores.length&&a.replies.length===b.replies.length&&a.stores.every((s,i)=>s.id===b.stores[i].id&&sameStore(s,b.stores[i]))&&a.replies.every((r,i)=>r.id===b.replies[i].id&&sameReply(r,b.replies[i]));}
export const isDefaultState=(state:DrawerState)=>sameState(state,initialState);

/** 이전 상태(클라우드에 있는 것)와 다음 상태를 비교해 필요한 쓰기만 만든다. orders 는 클라우드에 존재하는 문서와 그 order 값. */
export function computeCloudDiff(prev:DrawerState,next:DrawerState,orders:OrderMap):{ops:CloudOp[];orders:OrderMap}{
 const ops:CloudOp[]=[];
 const nextOrders:OrderMap={stores:assignOrders(next.stores.map(s=>s.id),orders.stores),replies:assignOrders(next.replies.map(r=>r.id),orders.replies)};
 for(const store of next.stores){const before=prev.stores.find(s=>s.id===store.id);const order=nextOrders.stores.get(store.id)!;if(!before||!orders.stores.has(store.id)||!sameStore(before,store)||orders.stores.get(store.id)!==order)ops.push({collection:"stores",id:store.id,type:"set",data:storeToDoc(store,order)});}
 for(const id of orders.stores.keys())if(!next.stores.some(s=>s.id===id))ops.push({collection:"stores",id,type:"delete"});
 for(const reply of next.replies){const before=prev.replies.find(r=>r.id===reply.id);const order=nextOrders.replies.get(reply.id)!;if(!before||!orders.replies.has(reply.id)||!sameReply(before,reply)||orders.replies.get(reply.id)!==order)ops.push({collection:"replies",id:reply.id,type:"set",data:replyToDoc(reply,order)});}
 for(const id of orders.replies.keys())if(!next.replies.some(r=>r.id===id))ops.push({collection:"replies",id,type:"delete"});
 return{ops,orders:nextOrders};
}

export function chunkOps<T>(items:T[],size=400):T[][]{const groups:T[][]=[];for(let i=0;i<items.length;i+=size)groups.push(items.slice(i,i+size));return groups;}

/** 최초 로그인 시 무엇을 올릴지 결정한다. 이 기기의 로컬 데이터는 한 계정에만 옮긴다(다른 계정으로 새어 들어가지 않게). */
export function planFirstSync({cloudExists,local,migratedTo,uid}:{cloudExists:boolean;local:DrawerState;migratedTo:string|null;uid:string}):{action:"upload"|"adopt";upload:DrawerState;backupLocal:boolean;migrated:boolean}{
 const belongsHere=migratedTo===null||migratedTo===uid;
 if(!cloudExists){const upload=belongsHere?local:structuredClone(initialState);return{action:"upload",upload,backupLocal:false,migrated:belongsHere&&!isDefaultState(local)};}
 return{action:"adopt",upload:local,backupLocal:!isDefaultState(local)&&migratedTo!==uid,migrated:false};
}
