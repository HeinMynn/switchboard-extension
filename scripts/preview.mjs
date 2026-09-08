// Local popup preview with synthetic metadata, never real account cookies.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
const mock = `
let state={mode:'chrome',domain:'dola.com',sites:['dola.com','example.com'],active:'a',pending:null,
accounts:[{id:'a',name:'Personal',count:12,savedAt:Date.now()-60000},{id:'b',name:'Work',count:8,savedAt:Date.now()-3600000}]};
globalThis.chrome={storage:{local:{get:async()=>({lastSite:'dola.com'}),set:async()=>{}}},permissions:{contains:async()=>true,request:async()=>true},runtime:{sendMessage:async m=>{
if(m.action==='switch')state.active=m.id;
if(m.action==='rename')state.accounts.find(a=>a.id===m.id).name=m.name;
if(m.action==='save'){const a=state.accounts.find(a=>a.id===state.active);if(a){a.savedAt=Date.now();a.count=10;}}
if(m.action==='new'){state.active=String(Date.now());state.accounts.push({id:state.active,name:m.name,count:0,savedAt:null});}
if(m.action==='forget')state.accounts=state.accounts.filter(a=>a.id!==m.id);
return {ok:true,data:structuredClone(state)};
}}};`;
const assets=new Map([['/popup.js','popup.js'],['/core.js','core.js'],['/popup.css','popup.css'],['/welcome.css','welcome.css'],['/welcome.js','welcome.js']]);
http.createServer(async(req,res)=>{
 try{
  if(req.url==='/welcome.html'){res.setHeader('Content-Type','text/html');return res.end(await readFile('src/shared/welcome.html'));}
  if (/^\/icons\/icon-(16|32|48|128)\.png$/.test(req.url)) { res.setHeader('Content-Type','image/png'); return res.end(await readFile('dist/chrome'+req.url)); }
  if(req.url==='/mock.js'){res.setHeader('Content-Type','text/javascript');return res.end(mock);}
  if(req.url==='/'||req.url==='/popup.html'){
   res.setHeader('Content-Type','text/html');
   return res.end((await readFile('src/shared/popup.html','utf8')).replace('<script type="module" src="popup.js">','<script src="mock.js"></script><script type="module" src="popup.js">'));
  }
  const file=assets.get(req.url);if(!file){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile('src/shared/'+file));
 }catch{res.writeHead(500);res.end('Preview failed');}
}).listen(4173,'127.0.0.1',()=>console.log('Synthetic UI preview: http://127.0.0.1:4173'));
