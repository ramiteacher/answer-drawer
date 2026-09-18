import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
const temp=path.resolve('.test-build');await fs.mkdir(temp,{recursive:true});
// firebase 를 끌고 오지 않는 순수 모듈만 번들한다 (CI 에 Firebase 설정이 없어도 통과해야 한다).
await build({entryPoints:['lib/model.ts','lib/storage.ts','lib/cloud-model.ts','lib/extension-id.ts'],bundle:true,outdir:temp,format:'esm',platform:'node',outExtension:{'.js':'.mjs'}});
const {fillTemplate,initialState}=await import(pathToFileURL(path.join(temp,'model.mjs')));
const store=await import(pathToFileURL(path.join(temp,'storage.mjs')));
const cloud=await import(pathToFileURL(path.join(temp,'cloud-model.mjs')));
const ids=await import(pathToFileURL(path.join(temp,'extension-id.mjs')));
test('store-specific substitution preserves all repeated and unknown variables',()=>{const a={...initialState.stores[0],name:'A스토어',exchangeFee:'6,000원'};const b={...a,name:'B스토어',exchangeFee:'4,000원'};assert.equal(fillTemplate('{스토어명} {교환 배송비} {스토어명}',a).text,'A스토어 6,000원 A스토어');assert.equal(fillTemplate('{스토어명} {교환 배송비}',b).text,'B스토어 4,000원');assert.deepEqual(fillTemplate('{반품 주소} {반품 주소} {알 수 없는 항목}',a).missing,['반품 주소','알 수 없는 항목']);});
test('backup rejects invalid versions, duplicate identifiers and missing required fields',()=>{assert.throws(()=>store.parseBackup('{bad'));assert.throws(()=>store.parseBackup(JSON.stringify({format:'other',version:1,data:initialState})));const invalid=structuredClone(initialState);invalid.stores.push({...invalid.stores[0]});assert.throws(()=>store.validateData(invalid));const malformed=structuredClone(initialState);delete malformed.stores[0].shipping;assert.throws(()=>store.validateData(malformed));assert.deepEqual(store.parseBackup(JSON.stringify(store.exportEnvelope(initialState))),initialState);});
test('text is preserved as text; oversized data is rejected',()=>{const data=structuredClone(initialState);data.replies[0].body='<img src=x onerror=alert(1)> {스토어명}';assert.equal(store.validateData(data).replies[0].body,data.replies[0].body);data.replies[0].body='x'.repeat(12001);assert.throws(()=>store.validateData(data));});
test('browser persistence, backup and restore retain previous data',async()=>{const memory=new Map();globalThis.location={protocol:'https:'};globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};assert.deepEqual(await store.loadData(),initialState);const a=structuredClone(initialState);a.stores[0].name='저장된 스토어';await store.saveData(a);assert.equal((await store.loadData()).stores[0].name,'저장된 스토어');const b=structuredClone(a);b.stores[0].name='가져온 스토어';await store.replaceData(b);assert.equal((await store.loadData()).stores[0].name,'가져온 스토어');assert.equal((await store.restorePrevious()).stores[0].name,'저장된 스토어');assert.equal(await store.readMigratedUid(),null);await store.markMigrated('uid-1');assert.equal(await store.readMigratedUid(),'uid-1');await store.keepAsPrevious(b);assert.equal((await store.loadPrevious()).stores[0].name,'가져온 스토어');globalThis.localStorage.setItem=()=>{throw new Error('quota')};await assert.rejects(store.saveData(b));assert.equal((await store.loadData()).stores[0].name,'저장된 스토어');});
test('extension persistence uses chrome.storage.local',async()=>{const memory={};globalThis.location={protocol:'chrome-extension:'};globalThis.chrome={storage:{local:{get:async k=>({[k]:memory[k]}),set:async update=>Object.assign(memory,update)}}};const a=structuredClone(initialState);a.stores[0].name='확장프로그램';await store.saveData(a);assert.equal((await store.loadData()).stores[0].name,'확장프로그램');delete globalThis.chrome;});

test('cloud documents rebuild state in order and skip damaged documents',()=>{
 const stores=[{id:'s2',data:{name:'둘째',channel:'쿠팡',address:'',exchangeFee:'',returnFee:'',shipping:'',returns:'',size:'',order:1}},{id:'s1',data:{name:'첫째',channel:'스마트스토어',address:'주소',exchangeFee:'',returnFee:'',shipping:'',returns:'',size:'',order:0}},{id:'broken',data:{name:'',order:5}}];
 const replies=[{id:'r-new',data:{title:'새 답변',category:'배송 문의',body:'내용',favorite:false,order:-1}},{id:'r-old',data:{title:'옛 답변',category:'없는 분류',body:'내용',favorite:'yes',order:0}},{id:'r-bad',data:{title:'제목만'}}];
 const {state,orders}=cloud.buildStateFromDocs(stores,replies);
 assert.deepEqual(state.stores.map(s=>s.id),['s1','s2']);assert.equal(state.stores[0].address,'주소');
 assert.deepEqual(state.replies.map(r=>r.id),['r-new','r-old']);assert.equal(state.replies[1].category,'기타 문의');assert.equal(state.replies[1].favorite,false);
 assert.deepEqual([...orders.replies.entries()],[['r-new',-1],['r-old',0]]);assert.equal(orders.stores.has('broken'),false);
 assert.doesNotThrow(()=>store.validateData(state));
 const empty=cloud.buildStateFromDocs([],[]);assert.equal(empty.state.stores.length,1);assert.equal(empty.state.replies.length,0);
});
test('order assignment keeps existing positions and gives new items room at either end',()=>{
 const existing=new Map([['a',0],['b',1],['c',2]]);
 assert.deepEqual([...cloud.assignOrders(['x','a','b','c'],existing)],[['x',-1],['a',0],['b',1],['c',2]]);
 assert.deepEqual([...cloud.assignOrders(['a','b','c','y'],existing)],[['a',0],['b',1],['c',2],['y',3]]);
 assert.deepEqual([...cloud.assignOrders(['a','m','b','c'],existing)],[['a',0],['m',0.5],['b',1],['c',2]]);
 assert.deepEqual([...cloud.assignOrders(['c','a'],existing)],[['c',2],['a',3]]);
 assert.deepEqual([...cloud.assignOrders(['p','q'],new Map())],[['p',0],['q',1]]);
});
test('cloud diff writes only what changed and deletes removed documents',()=>{
 const base=cloud.buildStateFromDocs([{id:'store-1',data:{...initialState.stores[0],order:0}}],initialState.replies.map((r,i)=>({id:r.id,data:{...r,order:i}})));
 assert.equal(cloud.sameState(base.state,initialState),true);
 assert.equal(cloud.computeCloudDiff(base.state,structuredClone(base.state),base.orders).ops.length,0);
 const added=structuredClone(base.state);added.replies.unshift({id:'fresh',title:'새 답변',category:'기타 문의',body:'본문',favorite:true});
 const diff=cloud.computeCloudDiff(base.state,added,base.orders);
 assert.deepEqual(diff.ops,[{collection:'replies',id:'fresh',type:'set',data:{title:'새 답변',category:'기타 문의',body:'본문',favorite:true,order:-1}}]);
 assert.equal(diff.orders.replies.get('fresh'),-1);
 const removed=structuredClone(added);removed.replies=removed.replies.filter(r=>r.id!=='tracking');removed.stores[0].name='바뀐 이름';
 const diff2=cloud.computeCloudDiff(added,removed,diff.orders);
 assert.deepEqual(diff2.ops.map(o=>[o.collection,o.id,o.type]),[['stores','store-1','set'],['replies','tracking','delete']]);
 assert.equal(diff2.ops[0].data.name,'바뀐 이름');assert.equal(diff2.ops[0].data.order,0);
 // 클라우드에 없는 항목(기본 스토어 주입 등)은 내용이 같아도 올린다
 const missing=cloud.computeCloudDiff(base.state,base.state,{stores:new Map(),replies:base.orders.replies});
 assert.deepEqual(missing.ops.map(o=>o.id),['store-1']);
 assert.equal(cloud.chunkOps(Array.from({length:850}),400).length,3);
});
test('first sync plan moves local data to one account only and keeps a backup when the cloud wins',()=>{
 const edited=structuredClone(initialState);edited.stores[0].name='내 진짜 스토어';
 assert.deepEqual(cloud.planFirstSync({cloudExists:false,local:edited,migratedTo:null,uid:'a'}),{action:'upload',upload:edited,backupLocal:false,migrated:true});
 assert.equal(cloud.planFirstSync({cloudExists:false,local:initialState,migratedTo:null,uid:'a'}).migrated,false);
 const other=cloud.planFirstSync({cloudExists:false,local:edited,migratedTo:'a',uid:'b'});assert.equal(other.action,'upload');assert.equal(cloud.isDefaultState(other.upload),true);assert.equal(other.migrated,false);
 assert.deepEqual(cloud.planFirstSync({cloudExists:true,local:edited,migratedTo:null,uid:'a'}),{action:'adopt',upload:edited,backupLocal:true,migrated:false});
 assert.equal(cloud.planFirstSync({cloudExists:true,local:edited,migratedTo:'a',uid:'a'}).backupLocal,false);
 assert.equal(cloud.planFirstSync({cloudExists:true,local:initialState,migratedTo:null,uid:'a'}).backupLocal,false);
});
test('extension id matches the pinned FreeCanvas helper public key',()=>{
 const der=Buffer.from(ids.EXTENSION_PUBLIC_KEY,'base64');
 const derived=crypto.createHash('sha256').update(der).digest('hex').slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
 assert.equal(derived,ids.EXTENSION_ID);
 assert.equal(ids.EXTENSION_ORIGIN,`chrome-extension://${ids.EXTENSION_ID}`);
 assert.equal(new URL(ids.AUTH_HELPER_URL).origin,ids.WEB_ORIGIN);
});
test('offscreen document only relays results from the helper iframe and answers the side panel',async()=>{
 const {outputFiles}=await build({entryPoints:['extension/offscreen.ts'],bundle:true,format:'iife',write:false});
 const code=outputFiles[0].text;
 let runtimeListener;let windowListener=null;let loadListener;const posted=[];
 const contentWindow={postMessage:(data,origin)=>posted.push({data,origin})};
 const iframe={addEventListener:(event,fn)=>{if(event==='load')loadListener=fn;},contentWindow};
 const context={URL,setTimeout:()=>1,clearTimeout:()=>{},console,document:{createElement:()=>iframe,body:{appendChild:()=>{}}},window:{addEventListener:(event,fn)=>{if(event==='message')windowListener=fn;},removeEventListener:(event,fn)=>{if(event==='message'&&windowListener===fn)windowListener=null;}},chrome:{runtime:{onMessage:{addListener:fn=>runtimeListener=fn}}}};
 context.globalThis=context;
 vm.runInNewContext(code,context);
 assert.equal(iframe.src,ids.AUTH_HELPER_URL);
 assert.equal(runtimeListener({target:'background',type:'answer-drawer-auth-run'},{},()=>{}),false);
 const responses=[];
 assert.equal(runtimeListener({target:'offscreen',type:'answer-drawer-auth-run'},{},r=>responses.push(r)),true);
 assert.equal(posted.length,0);loadListener();await Promise.resolve();await Promise.resolve();
 // vm 컨텍스트에서 만든 객체는 프로토타입이 달라 strict 비교가 실패하므로 JSON 으로 비교한다
 assert.deepEqual(JSON.parse(JSON.stringify(posted)),[{data:{type:'answer-drawer-init-auth'},origin:ids.WEB_ORIGIN}]);
 windowListener({origin:'https://evil.example',source:contentWindow,data:{type:'answer-drawer-auth-result',ok:true,idToken:'x'}});
 windowListener({origin:ids.WEB_ORIGIN,source:{},data:{type:'answer-drawer-auth-result',ok:true,idToken:'x'}});
 windowListener({origin:ids.WEB_ORIGIN,source:contentWindow,data:'!_{firebase-internal}'});
 assert.equal(responses.length,0);
 windowListener({origin:ids.WEB_ORIGIN,source:contentWindow,data:{type:'answer-drawer-auth-result',ok:true,idToken:'id-token',accessToken:'access-token'}});
 assert.deepEqual(JSON.parse(JSON.stringify(responses)),[{ok:true,idToken:'id-token',accessToken:'access-token'}]);
 assert.equal(windowListener,null);
 const again=[];runtimeListener({target:'offscreen',type:'answer-drawer-auth-run'},{},r=>again.push(r));
 windowListener({origin:ids.WEB_ORIGIN,source:contentWindow,data:{type:'answer-drawer-auth-result',ok:false,error:'닫힘'}});
 assert.deepEqual(JSON.parse(JSON.stringify(again)),[{ok:false,error:'닫힘'}]);
});
