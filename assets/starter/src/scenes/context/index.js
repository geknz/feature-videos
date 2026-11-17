import {cameraPose} from '../../shared/motion.mjs';
export function mount(root){root.innerHTML='<div class="content"><div class="demo-card"><small>Capture scaffold</small><span>Replace with product UI</span></div></div>';}
export function seek(t,{device}){const p=cameraPose({x:0,y:0,scale:1.28},{x:0,y:0,scale:1.5},t,0.3,0.6);device.style.transform=`translate(${p.x}px,${p.y}px) scale(${p.scale})`;}
