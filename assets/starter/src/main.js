const film=await fetch('/film.json').then(r=>r.json());
const canvas=document.querySelector('#canvas');
const params=new URLSearchParams(location.search),scale=Number(params.get('scale')||1);
canvas.style.width=film.width+'px';canvas.style.height=film.height+'px';canvas.style.transform=`scale(${scale})`;
const shell=await fetch('/src/shared/device-frame.html').then(r=>r.text());
canvas.innerHTML=shell;
const screen=canvas.querySelector('.feature-video-screen'),root=document.createElement('main');screen.append(root);
const indicator=document.createElement('div');indicator.className='feature-video-home-indicator';screen.append(indicator);
const stage=canvas.querySelector('.feature-video-stage');stage.style.width=film.width+'px';stage.style.height=film.height+'px';
const modules=Object.fromEntries(await Promise.all(film.scenes.map(async s=>[s.id,await import('/'+s.entry)])));
let active;
window.seek=async(id,t)=>{
 const s=film.scenes.find(s=>s.id===id);if(!s)throw Error('Unknown scene '+id);
 if(active!==id){root.replaceChildren();modules[id].mount(root);active=id;}
 await modules[id].seek(t,{root,device:canvas.querySelector('.feature-video-device'),duration:s.duration});
 await new Promise(requestAnimationFrame);
};
window.prepare=async(id,times)=>{
 for(const t of times)await window.seek(id,t);
 await document.fonts.ready;
 await Promise.all([...document.images].map(i=>i.decode()));
};
await window.seek(film.scenes[0].id,0);window.ready=true;
if(!params.has('capture')){
 const total=film.scenes.reduce((v,s)=>v+s.duration,0),start=performance.now();
 async function tick(){let t=((performance.now()-start)/1000)%total;let s=film.scenes[0];for(const candidate of film.scenes){s=candidate;if(t<s.duration)break;t-=s.duration;}await window.seek(s.id,t);requestAnimationFrame(tick);}requestAnimationFrame(tick);
}
