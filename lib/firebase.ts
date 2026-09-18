// Firebase 초기화. 프리캔버스AI(marketgen-ai-87525) 프로젝트를 함께 쓴다 — 같은 Google 계정이 같은 UID.
// 설정값은 VITE_FIREBASE_* 환경 변수(.env.local / GitHub Actions secrets)로 주입한다.
// VITE_FIREBASE_EMULATOR=1 이면 로컬 에뮬레이터(demo-answer-drawer)에 붙는다 — 개발·검증 전용.
import {initializeApp,type FirebaseApp} from "firebase/app";
import {getAuth,connectAuthEmulator,GoogleAuthProvider,type Auth} from "firebase/auth";
import {initializeFirestore,connectFirestoreEmulator,persistentLocalCache,persistentMultipleTabManager,type Firestore} from "firebase/firestore";

const env=import.meta.env;
export const useEmulator=env.VITE_FIREBASE_EMULATOR==="1";
const config=useEmulator
 ?{apiKey:"demo-api-key",authDomain:"127.0.0.1",projectId:"demo-answer-drawer",appId:"demo-app"}
 :{apiKey:env.VITE_FIREBASE_API_KEY??"",authDomain:env.VITE_FIREBASE_AUTH_DOMAIN??"",projectId:env.VITE_FIREBASE_PROJECT_ID??"",storageBucket:env.VITE_FIREBASE_STORAGE_BUCKET??"",messagingSenderId:env.VITE_FIREBASE_MESSAGING_SENDER_ID??"",appId:env.VITE_FIREBASE_APP_ID??""};
export const firebaseEnabled=Boolean(config.apiKey&&config.authDomain&&config.projectId);

let app:FirebaseApp|undefined;let authInstance:Auth|undefined;let dbInstance:Firestore|undefined;
function ensureApp(){if(!firebaseEnabled)throw new Error("로그인 설정이 없어요. VITE_FIREBASE_* 환경 변수를 확인해 주세요.");if(!app)app=initializeApp(config);return app;}
export function getFirebaseAuth(){if(!authInstance){authInstance=getAuth(ensureApp());if(useEmulator)connectAuthEmulator(authInstance,"http://127.0.0.1:9099",{disableWarnings:true});}return authInstance;}
export function getDb(){if(!dbInstance){dbInstance=initializeFirestore(ensureApp(),{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});if(useEmulator)connectFirestoreEmulator(dbInstance,"127.0.0.1",8080);}return dbInstance;}
export function googleProvider(){const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:"select_account"});return provider;}
