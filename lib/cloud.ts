// Firestore 읽기/쓰기 계층. 순수 로직은 cloud-model.ts 에 있다.
import {collection,doc,getDocFromServer,onSnapshot,runTransaction,serverTimestamp,writeBatch,type QuerySnapshot,type Unsubscribe} from "firebase/firestore";
import {getDb} from "./firebase";
import type {DrawerState} from "./model";
import {assignOrders,buildStateFromDocs,chunkOps,replyToDoc,storeToDoc,type CloudOp,type OrderMap} from "./cloud-model";

const ROOT="answerDrawer";
export type CloudSnapshot={state:DrawerState;orders:OrderMap;fromCache:boolean;hasPendingWrites:boolean};
export type CloudError={code:string;message:string};

/** stores/replies 두 컬렉션을 구독해 하나의 상태로 합쳐 전달한다. 메타데이터 변화(캐시→서버 확인)도 알린다. */
export function subscribeCloud(uid:string,onData:(snap:CloudSnapshot)=>void,onError:(err:CloudError)=>void):Unsubscribe{
 const db=getDb();let stores:QuerySnapshot|null=null;let replies:QuerySnapshot|null=null;
 function emit(){if(!stores||!replies)return;const built=buildStateFromDocs(stores.docs.map(d=>({id:d.id,data:d.data()})),replies.docs.map(d=>({id:d.id,data:d.data()})));onData({...built,fromCache:stores.metadata.fromCache||replies.metadata.fromCache,hasPendingWrites:stores.metadata.hasPendingWrites||replies.metadata.hasPendingWrites});}
 const fail=(err:{code?:string;message?:string})=>onError({code:err.code??"unknown",message:err.message??String(err)});
 const options={includeMetadataChanges:true};
 const offStores=onSnapshot(collection(db,ROOT,uid,"stores"),options,snap=>{stores=snap;emit();},fail);
 const offReplies=onSnapshot(collection(db,ROOT,uid,"replies"),options,snap=>{replies=snap;emit();},fail);
 return()=>{offStores();offReplies();};
}

/** 서버에서 직접 확인한다(캐시 아님). 오프라인이면 예외. */
export async function cloudExists(uid:string):Promise<boolean>{const snap=await getDocFromServer(doc(getDb(),ROOT,uid));return snap.exists();}

/** 변경 묶음을 400개 단위 batch 로 쓴다. 오프라인이면 SDK 가 큐에 두고 연결 후 올린다(그동안 promise 는 대기). */
export async function applyOps(uid:string,ops:CloudOp[]):Promise<void>{
 const db=getDb();
 for(const group of chunkOps(ops,400)){const batch=writeBatch(db);for(const op of group){const ref=doc(db,ROOT,uid,op.collection,op.id);if(op.type==="set")batch.set(ref,{...op.data,updatedAt:serverTimestamp()});else batch.delete(ref);}batch.set(doc(db,ROOT,uid),{updatedAt:serverTimestamp()},{merge:true});await batch.commit();}
}

/** 메타 문서가 없을 때만 만들고(트랜잭션 — 웹·확장이 동시에 첫 로그인해도 한 번만) 데이터를 올린다. */
export async function initializeCloud(uid:string,data:DrawerState,source:"web"|"extension"):Promise<"created"|"exists">{
 const db=getDb();const meta=doc(db,ROOT,uid);
 const created=await runTransaction(db,async tx=>{const snap=await tx.get(meta);if(snap.exists())return false;tx.set(meta,{initializedAt:serverTimestamp(),updatedAt:serverTimestamp(),migrationVersion:1,source});return true;});
 if(!created)return"exists";
 const storeOrders=assignOrders(data.stores.map(s=>s.id),new Map());const replyOrders=assignOrders(data.replies.map(r=>r.id),new Map());
 const ops:CloudOp[]=[...data.stores.map((s):CloudOp=>({collection:"stores",id:s.id,type:"set",data:storeToDoc(s,storeOrders.get(s.id)!)})),...data.replies.map((r):CloudOp=>({collection:"replies",id:r.id,type:"set",data:replyToDoc(r,replyOrders.get(r.id)!)}))];
 await applyOps(uid,ops);
 return"created";
}
