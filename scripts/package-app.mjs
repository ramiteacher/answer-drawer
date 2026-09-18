// 빌드 산출물
//  - dist/                       GitHub Pages 정적 사이트 (index.html + auth.html)
//  - release/answer-drawer/      프리캔버스AI 보조 확장에 넣는 사이드패널 폴더 (sidepanel.html · offscreen.html · offscreen.js · assets/)
//  - release/answer-drawer-panel.zip, release/answer-drawer-github-pages.zip
// 확장 폴더를 marketgen-ai 저장소로 복사하는 것은 scripts/sync-freecanvas-extension.mjs 가 한다.
import {build,loadEnv} from 'vite';
import {build as bundle} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const release=path.join(root,'release');
const crcTable=Array.from({length:256},(_,i)=>{let n=i;for(let j=0;j<8;j++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(buffer){let crc=0xffffffff;for(const b of buffer)crc=crcTable[(crc^b)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
export async function zipDirectory(dir,out,exclude=[]){const files=[];async function walk(at,prefix=''){for(const entry of (await fs.readdir(at,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(exclude.includes(entry.name))continue;const rel=prefix+entry.name;if(entry.isDirectory())await walk(path.join(at,entry.name),rel+'/');else files.push({name:rel,bytes:await fs.readFile(path.join(at,entry.name))});}}await walk(dir);const locals=[],centrals=[];let offset=0;for(const file of files){const name=Buffer.from(file.name);const data=file.bytes;const crc=crc32(data);const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);locals.push(local,name,data);const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);centrals.push(central,name);offset+=local.length+name.length+data.length;}const directory=Buffer.concat(centrals);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);await fs.writeFile(out,Buffer.concat([...locals,directory,end]));}
async function resetDir(target){const absolute=path.resolve(target);if(!absolute.startsWith(path.resolve(release)+path.sep))throw new Error('Unsafe output path');await fs.rm(absolute,{recursive:true,force:true});await fs.mkdir(absolute,{recursive:true});}
async function main(){
 const env=loadEnv('production',root,'VITE_');
 if(!env.VITE_FIREBASE_API_KEY&&process.env.ANSWER_DRAWER_ALLOW_NO_FIREBASE!=='1')throw new Error('VITE_FIREBASE_* 설정이 없습니다. .env.local 또는 GitHub Actions secrets 를 확인하세요. (로그인 없는 검토용 빌드: ANSWER_DRAWER_ALLOW_NO_FIREBASE=1)');
 await build({root,configFile:path.join(root,'vite.pages.config.ts'),logLevel:'warn'});
 const dist=path.join(root,'dist');
 await fs.writeFile(path.join(dist,'.nojekyll'),'');
 const panel=path.join(release,'answer-drawer');await resetDir(panel);
 await fs.cp(dist,panel,{recursive:true,filter:src=>{const rel=path.relative(dist,src);return!['auth.html','index.html','.nojekyll'].includes(rel);}});
 const index=await fs.readFile(path.join(dist,'index.html'),'utf8');
 if(/<script(?![^>]*\ssrc=)[^>]*>/i.test(index))throw new Error('index.html 에 인라인 스크립트가 있습니다 — 확장 CSP 에서 실행되지 않습니다.');
 await fs.writeFile(path.join(panel,'sidepanel.html'),index);
 await fs.copyFile(path.join(root,'extension','offscreen.html'),path.join(panel,'offscreen.html'));
 await bundle({entryPoints:[path.join(root,'extension/offscreen.ts')],bundle:true,format:'iife',target:'chrome116',minify:true,outfile:path.join(panel,'offscreen.js')});
 await zipDirectory(panel,path.join(release,'answer-drawer-panel.zip'));
 await zipDirectory(dist,path.join(release,'answer-drawer-github-pages.zip'));
 console.log('Ready: dist/ (Pages), release/answer-drawer/ (확장 사이드패널 폴더), release/answer-drawer-panel.zip, release/answer-drawer-github-pages.zip');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
