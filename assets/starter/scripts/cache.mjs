import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
function walk(p){if(!statSync(p).isDirectory())return[p];return readdirSync(p).sort().flatMap(n=>walk(resolve(p,n)));}
export function keyFor(root,film,scene,profile){
 const hash=createHash('sha256');const add=x=>hash.update(JSON.stringify(x)+'\n');
 const {scenes,...global}=film;add({global,scene,profile});
 // Scene folders are exclusive ownership boundaries; all other source is shared.
 const dirs=scenes.map(s=>resolve(root,dirname(s.entry)));
 if(new Set(dirs).size!==dirs.length)throw Error('Each scene needs its own folder');
 const own=resolve(root,dirname(scene.entry));
 for(const base of ['src','scripts','index.html','package.json']){
  for(const f of walk(resolve(root,base))){if(dirs.some(d=>f.startsWith(d+'/'))&&!f.startsWith(own+'/'))continue;add(relative(root,f));hash.update(readFileSync(f));}
 }
 // Shared assets, lockfile and external product dependencies are content-hashed.
 for(const dep of [...(film.dependencies||[]),...(scene.dependencies||[])])for(const f of walk(resolve(root,dep))){add(f);hash.update(readFileSync(f));}
 return hash.digest('hex').slice(0,24);
}
