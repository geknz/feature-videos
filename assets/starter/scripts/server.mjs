import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export function serve(root,port=0){return new Promise((yes,no)=>{const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://local').pathname);const file=resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+sep))throw Error('outside root');const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end('Not found');}});server.once('error',no);server.listen(port,'127.0.0.1',()=>yes(server));});}
if(process.argv[1]===fileURLToPath(import.meta.url)){const server=await serve(resolve('.'),Number(process.env.PORT||4337));console.log(`Preview: http://127.0.0.1:${server.address().port}`);}
