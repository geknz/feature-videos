import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {serve} from './server.mjs';
import {keyFor} from './cache.mjs';
const root=resolve('.'),mode=process.argv[2]||'draft';
if(!['plan','check','draft','final'].includes(mode))throw Error('Use plan/check/draft/final');
const film=JSON.parse(readFileSync('film.json')),profileName=mode==='final'?'final':'draft',profile=film.profiles[profileName];
const {fps,dpr,scale,crf}=profile,width=Math.ceil(film.width*scale/2)*2,height=Math.ceil(film.height*scale/2)*2;
if(![width,height,fps,dpr].every(v=>Number.isInteger(v)&&v>0)||width%2||height%2)throw Error('Invalid dimensions/profile');
if(new Set(film.scenes.map(s=>s.id)).size!==film.scenes.length||!film.scenes.length)throw Error('Scenes need unique ids');
for(const s of film.scenes)if(!/^[a-z0-9-]+$/.test(s.id)||!(s.duration>0)||Math.abs(s.duration*fps-Math.round(s.duration*fps))>1e-6)throw Error('Invalid scene id/duration');
mkdirSync('out',{recursive:true});mkdirSync('qa',{recursive:true});mkdirSync('.cache',{recursive:true});
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8'});if(r.error||r.status!==0)throw Error(r.stderr||String(r.error));return r.stdout;};
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const jobs=film.scenes.map(scene=>{const key=keyFor(root,film,scene,profile),dir=join('.cache',profileName,scene.id,key);return{scene,key,dir,part:join(dir,'clip.mp4')};});
function cached(j){try{return JSON.parse(readFileSync(join(j.dir,'complete.json'))).sha256===digest(j.part);}catch{return false;}}
console.log(JSON.stringify(jobs.map(j=>({scene:j.scene.id,render:!cached(j),key:j.key})),null,2));
if(mode==='plan')process.exit(0);
let server,browser;
const report={mode,rendered:[],reused:[],checked:[],started:new Date().toISOString()};
async function pageFor(scene){
 if(!server){server=await serve(root);browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true,args:['--force-color-profile=srgb']});}
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,locale:'en-GB',timezoneId:'UTC',colorScheme:'dark'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.address().port}/?capture=1&scale=${scale}`);
 await page.waitForFunction(()=>window.ready===true);
 const times=[...new Set([0,...(scene.checks||[]),Math.max(0,scene.duration-1/fps)])].filter(t=>t>=0&&t<scene.duration).sort((a,b)=>a-b);
 await page.evaluate(async({id,times})=>window.prepare(id,times),{id:scene.id,times});
 const assert=()=>{if(errors.length)throw Error(errors.join('\n'));};assert();
 return {page,context,times,assert};
}
try{
 for(const j of jobs){
  const checkMarker=join(j.dir,'checked.json');
  if(mode==='check'&&existsSync(checkMarker)){report.reused.push(j.scene.id);continue;}
  if(mode!=='check'&&cached(j)){report.reused.push(j.scene.id);continue;}
  mkdirSync(j.dir,{recursive:true});const {page,context,times,assert}=await pageFor(j.scene);
  try{
   const frames=[];
   for(const [i,t] of times.entries()){await page.evaluate(({id,t})=>window.seek(id,t),{id:j.scene.id,t});const path=join(j.dir,`check-${i}.png`);await page.screenshot({path,animations:'disabled'});frames.push({t,path});}
   assert();writeFileSync(checkMarker,JSON.stringify(frames,null,2));report.checked.push({scene:j.scene.id,frames});
   if(mode==='check')continue;
   const temp=join(j.dir,'partial.mp4');
   const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','-','-an','-vf',`scale=${width}:${height}:flags=lanczos:in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p`,'-c:v','libx264','-preset',mode==='draft'?'ultrafast':'fast','-crf',String(crf),'-threads','2','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',temp],{stdio:['pipe','ignore','pipe']});
   let stderr='';ff.stderr.on('data',x=>stderr+=x);ff.stdin.on('error',()=>{});
   const done=new Promise((ok,no)=>{ff.on('error',no);ff.on('close',code=>code===0?ok():no(Error(stderr||'Encoder failed')));});done.catch(()=>{});
   try{
    const n=Math.round(j.scene.duration*fps);
    for(let frame=0;frame<n;frame++){await page.evaluate(({id,t})=>window.seek(id,t),{id:j.scene.id,t:frame/fps});const png=await page.screenshot({type:'jpeg',quality:mode==='draft'?85:98,animations:'disabled',caret:'hide'});if(!ff.stdin.write(png))await Promise.race([once(ff.stdin,'drain'),done.then(()=>{throw Error('Encoder stopped early');})]);}
    ff.stdin.end();await done;assert();
    run('ffmpeg',['-v','error','-i',temp,'-f','null','-']);
    const meta=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',temp]));const v=meta.streams[0];
    if(meta.streams.length!==1||v.width!==width||v.height!==height||Number(v.nb_read_frames)!==n||v.pix_fmt!=='yuv420p')throw Error('Clip validation failed: '+JSON.stringify({expected:{width,height,n},meta}));
    renameSync(temp,j.part);writeFileSync(join(j.dir,'complete.json'),JSON.stringify({sha256:digest(j.part),meta},null,2));report.rendered.push(j.scene.id);
   }catch(e){ff.kill('SIGTERM');rmSync(temp,{force:true});throw e;}
  }finally{await context.close();}
 }
 if(mode!=='check'){
  const output=`out/${mode}.mp4`,assembly=createHash('sha256').update(JSON.stringify(jobs.map(j=>j.key))).digest('hex');
  let previous;try{previous=JSON.parse(readFileSync(`out/${mode}.json`));}catch{}
  if(previous?.assembly!==assembly||!existsSync(output)||previous.sha256!==digest(output)){
   const list=join('.cache',`${mode}-concat.txt`);writeFileSync(list,jobs.map(j=>`file '${resolve(j.part).replaceAll("'","'\\''")}'`).join('\n')+'\n');
   const temp=`out/${mode}-partial.mp4`;run('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',list,'-map','0:v:0','-c','copy','-an','-movflags','+faststart',temp]);
   const meta=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',temp]));
   const expected=film.scenes.reduce((n,s)=>n+s.duration,0);if(Math.abs(Number(meta.format.duration)-expected)>1/fps+0.001)throw Error('Assembly duration mismatch');
   renameSync(temp,output);writeFileSync(`out/${mode}.json`,JSON.stringify({assembly,sha256:digest(output),meta},null,2));
  }
  report.output=output;
 }
}finally{await browser?.close();server?.close();report.finished=new Date().toISOString();writeFileSync(`qa/${mode}.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
