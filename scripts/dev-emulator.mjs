// 로컬 에뮬레이터(demo-answer-drawer)에 붙는 개발 서버. 먼저 `npm run emulators` 를 띄워 둔다.
// 실제 Firebase 프로젝트를 건드리지 않고 로그인·동기화·규칙을 검증할 때 쓴다.
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const vite=path.join(root,'node_modules','vite','bin','vite.js');
const child=spawn(process.execPath,[vite,'--config',path.join(root,'vite.pages.config.ts'),...process.argv.slice(2)],{cwd:root,stdio:'inherit',env:{...process.env,VITE_FIREBASE_EMULATOR:'1'}});
child.on('exit',code=>process.exit(code??0));
