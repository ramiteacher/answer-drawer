// Firestore 규칙 테스트 — 에뮬레이터가 필요하다: npm run test:rules (firebase-tools CLI 설치 필요)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';

const env=await initializeTestEnvironment({projectId:'demo-answer-drawer',firestore:{rules:await fs.readFile('emulator/firestore.rules','utf8'),host:'127.0.0.1',port:8080}});
// alice: 베이직 플랜 클레임(프리캔버스 syncPlanClaims 가 발급) — 쓰기 허용. free: 로그인은 했지만 구독 없음 — 읽기만.
const alice=env.authenticatedContext('alice',{email:'alice@example.com',plan:'basic'}).firestore();
const free=env.authenticatedContext('free',{email:'free@example.com'}).firestore();
const bob=env.authenticatedContext('bob',{email:'bob@example.com'}).firestore();
const anon=env.unauthenticatedContext().firestore();
const storeDoc={name:'내 스토어',channel:'스마트스토어',address:'',exchangeFee:'',returnFee:'',shipping:'',returns:'',size:'',order:0,updatedAt:new Date()};
const replyDoc={title:'언제 배송되나요?',category:'배송 문의',body:'안녕하세요',favorite:true,order:0,updatedAt:new Date()};

test.after(async()=>{await env.cleanup();});

test('owner can create meta, stores and replies and read them back',async()=>{
 await assertSucceeds(alice.doc('answerDrawer/alice').set({initializedAt:new Date(),updatedAt:new Date(),migrationVersion:1,source:'web'}));
 await assertSucceeds(alice.doc('answerDrawer/alice/stores/store-1').set(storeDoc));
 await assertSucceeds(alice.doc('answerDrawer/alice/replies/r1').set(replyDoc));
 await assertSucceeds(alice.collection('answerDrawer/alice/replies').get());
 await assertSucceeds(alice.doc('answerDrawer/alice/replies/r1').delete());
});
test('signed-in users without a paid plan claim can read their own data but cannot write',async()=>{
 await assertFails(free.doc('answerDrawer/free').set({initializedAt:new Date(),updatedAt:new Date(),migrationVersion:1,source:'web'}));
 await assertFails(free.doc('answerDrawer/free/replies/r1').set(replyDoc));
 await assertFails(free.doc('answerDrawer/free/stores/s1').set(storeDoc));
 await assertSucceeds(free.collection('answerDrawer/free/replies').get());
 await assertSucceeds(free.doc('answerDrawer/free').get());
});
test('other users and anonymous visitors are denied everything',async()=>{
 await assertFails(bob.doc('answerDrawer/alice').get());
 await assertFails(bob.collection('answerDrawer/alice/stores').get());
 await assertFails(bob.doc('answerDrawer/alice/replies/r1').set(replyDoc));
 await assertFails(bob.doc('answerDrawer/alice/stores/store-1').delete());
 await assertFails(anon.collection('answerDrawer/alice/replies').get());
 await assertFails(anon.doc('answerDrawer/alice/replies/x').set(replyDoc));
 await assertFails(anon.doc('answerDrawer/anon-uid').set({updatedAt:new Date()}));
});
test('listing across users or the root collection is denied',async()=>{
 await assertFails(bob.collection('answerDrawer').get());
 await assertFails(bob.collectionGroup('replies').get());
 await assertFails(alice.collectionGroup('replies').get());
});
test('unexpected fields, wrong types and oversized values are rejected',async()=>{
 await assertFails(alice.doc('answerDrawer/alice/replies/r2').set({...replyDoc,extra:'x'}));
 await assertFails(alice.doc('answerDrawer/alice/replies/r2').set({...replyDoc,favorite:'yes'}));
 await assertFails(alice.doc('answerDrawer/alice/replies/r2').set({...replyDoc,body:'x'.repeat(12001)}));
 await assertFails(alice.doc('answerDrawer/alice/stores/s2').set({...storeDoc,name:'x'.repeat(101)}));
 await assertFails(alice.doc('answerDrawer/alice/stores/s2').set({...storeDoc,order:'first'}));
 await assertFails(alice.doc('answerDrawer/alice').set({secret:'x'}));
 await assertSucceeds(alice.doc('answerDrawer/alice').set({updatedAt:new Date()},{merge:true}));
});
