// release/answer-drawer/ 를 프리캔버스AI 보조 확장(marketgen-ai 저장소)에 복사한다.
//   node scripts/sync-freecanvas-extension.mjs [marketgen-ai 경로]
// 소스 폴더(chrome-extension/marketgen-smartstore)와 배포 미러(public/downloads/freecanvas-ai-helper) 둘 다 갱신한다.
// 복사 후에는 marketgen-ai 에서 manifest 버전을 올리고 `npm run package:smartstore-extension` 으로 ZIP 을 다시 만든다.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source=path.join(root,'release','answer-drawer');
const marketgen=path.resolve(process.argv[2]||process.env.MARKETGEN_DIR||path.join(root,'..','..','marketgen-ai'));
const targets=[path.join(marketgen,'chrome-extension','marketgen-smartstore'),path.join(marketgen,'public','downloads','freecanvas-ai-helper')];
const ids=await fs.readFile(path.join(root,'lib','extension-id.ts'),'utf8');
const constant=name=>ids.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`))?.[1];
const EXTENSION_ID=constant('EXTENSION_ID'),EXTENSION_PUBLIC_KEY=constant('EXTENSION_PUBLIC_KEY'),PANEL_DIR=constant('PANEL_DIR')||'answer-drawer';
try{await fs.access(path.join(source,'sidepanel.html'));}catch{throw new Error(`먼저 npm run build 를 실행하세요 (${source} 없음)`);}
for(const dir of targets){
 const manifestPath=path.join(dir,'manifest.json');
 let manifest;try{manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));}catch{throw new Error(`확장 manifest 를 찾지 못했습니다: ${manifestPath}`);}
 const dest=path.join(dir,PANEL_DIR);
 await fs.rm(dest,{recursive:true,force:true});
 await fs.cp(source,dest,{recursive:true});
 const problems=[];
 if(manifest.side_panel?.default_path!==`${PANEL_DIR}/sidepanel.html`)problems.push(`side_panel.default_path 가 ${PANEL_DIR}/sidepanel.html 이 아닙니다`);
 for(const permission of ['sidePanel','offscreen','storage'])if(!manifest.permissions?.includes(permission))problems.push(`permissions 에 ${permission} 이 없습니다`);
 if(EXTENSION_PUBLIC_KEY&&manifest.key!==EXTENSION_PUBLIC_KEY)problems.push(`manifest.key 가 lib/extension-id.ts 의 공개키(ID ${EXTENSION_ID})와 다릅니다`);
 console.log(`복사 완료 → ${path.relative(marketgen,dest)} (manifest ${manifest.version})${problems.length?`\n  ⚠ ${problems.join('\n  ⚠ ')}`:''}`);
}
console.log('다음: marketgen-ai 에서 manifest 버전 확인 → npm run package:smartstore-extension');
