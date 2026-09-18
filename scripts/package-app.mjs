import {build} from 'vite';
import {build as bundle} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const release=path.join(root,'release');
const crcTable=Array.from({length:256},(_,i)=>{let n=i;for(let j=0;j<8;j++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(buffer){let crc=0xffffffff;for(const b of buffer)crc=crcTable[(crc^b)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function png(size){const rows=Buffer.alloc(size*(1+size*4));for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*(1+size*4)+1+x*4;const nx=x/size,ny=y/size;const corner=Math.min(nx,1-nx)<.05&&Math.min(ny,1-ny)<.05;const white=(nx>.23&&nx<.77&&ny>.25&&ny<.39)||((nx>.28&&nx<.72&&ny>.4&&ny<.75)&&((nx<.33||nx>.67)||ny>.7))||(nx>.42&&nx<.58&&ny>.51&&ny<.56);const c=white?[255,255,255]:[56,89,219];rows.set([...c,corner?0:255],i);}function chunk(type,data){const name=Buffer.from(type);const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([name,data])),8+data.length);return out;}const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);}
export async function zipDirectory(dir,out,exclude=[]){const files=[];async function walk(at,prefix=''){for(const entry of (await fs.readdir(at,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(exclude.includes(entry.name))continue;const rel=prefix+entry.name;if(entry.isDirectory())await walk(path.join(at,entry.name),rel+'/');else files.push({name:rel,bytes:await fs.readFile(path.join(at,entry.name))});}}await walk(dir);const locals=[],centrals=[];let offset=0;for(const file of files){const name=Buffer.from(file.name);const data=file.bytes;const crc=crc32(data);const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);locals.push(local,name,data);const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);centrals.push(central,name);offset+=local.length+name.length+data.length;}const directory=Buffer.concat(centrals);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);await fs.writeFile(out,Buffer.concat([...locals,directory,end]));}
async function main(){
 await build({root,configFile:path.join(root,'vite.pages.config.ts')});
 const ext=path.join(release,'extension');await fs.mkdir(ext,{recursive:true});
 // Clean only the known build folder. Never touch source extension files.
 for(const target of [ext]){const absolute=path.resolve(target);if(!absolute.startsWith(path.resolve(release)+path.sep))throw new Error('Unsafe output path');await fs.rm(absolute,{recursive:true,force:true});await fs.mkdir(absolute,{recursive:true});}
 await fs.cp(path.join(root,'dist'),ext,{recursive:true});
 for(const name of ['manifest.json','background.js'])await fs.copyFile(path.join(root,'extension',name),path.join(ext,name));
 await fs.copyFile(path.join(ext,'index.html'),path.join(ext,'sidepanel.html'));
 await bundle({entryPoints:[path.join(root,'extension/bridge.ts')],bundle:true,format:'iife',target:'chrome116',minify:true,outfile:path.join(ext,'bridge.js')});
 await fs.mkdir(path.join(ext,'icons'),{recursive:true});for(const n of [16,32,48,128])await fs.writeFile(path.join(ext,'icons',`icon${n}.png`),png(n));
 await fs.writeFile(path.join(root,'dist','.nojekyll'),'');
 await zipDirectory(ext,path.join(release,'answer-drawer-extension.zip'));
 await fs.copyFile(path.join(release,'answer-drawer-extension.zip'),path.join(root,'dist','answer-drawer-extension.zip'));
 await zipDirectory(path.join(root,'dist'),path.join(release,'answer-drawer-github-pages.zip'));
 console.log('Ready: release/answer-drawer-extension.zip, release/answer-drawer-github-pages.zip');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
