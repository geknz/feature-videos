import {cameraPose,pressFeedback} from '../../shared/motion.mjs';
export function mount(root){root.innerHTML='<div class="content"><div class="demo-card"><small>Capture scaffold</small><span></span></div></div>';}
export function seek(t,{root,device}){const p=cameraPose({x:0,y:0,scale:1.5},{x:0,y:0,scale:1.28},t,1.2,0.6);device.style.transform=`translate(${p.x}px,${p.y}px) scale(${p.scale})`;root.querySelector('span').textContent=t<0.4?'Replace with product UI':'Show confirmed result';root.querySelector('.demo-card').style.transform=`scale(${pressFeedback(t-0.3).scale})`;}
