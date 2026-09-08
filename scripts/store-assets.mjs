// Local-only store artwork and real popup screenshots with synthetic data.
// Run with SWITCHBOARD_SHARP pointing to the installed sharp package directory.
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SWITCHBOARD_SHARP || 'sharp');
const output = 'store/assets';
await mkdir(output, { recursive: true });
const specs = [
  ['01-account-switching.png',1280,800,'YOUR ACCOUNTS, ORGANIZED','A familiar place\nfor every login.','Name your accounts. Find the right one.\nSwitch without closing your tabs.','/popup.html'],
  ['02-rename-accounts.png',1280,800,'MAKE IT YOURS','Names that\nmake sense to you.','Personal, Work, or your next project.\nRename saved accounts in a few clicks.','/popup.html'],
  ['03-export-cookies.png',1280,800,'TAKE A COPY WITH YOU','Your cookies.\nYour choice of format.','Export saved cookies as .json or .txt.\nBoth contain easy-to-read JSON.','/popup.html'],
  ['04-manage-websites.png',1280,800,'A PLACE FOR EACH WEBSITE','More websites.\nOne simple picker.','Connect a website, organize its accounts,\nand remove saved entries when you’re done.','/popup.html'],
  ['05-setup-guide.png',1280,800,'A LITTLE HELP TO GET STARTED','Clear steps.\nRight from the start.','A built-in guide walks you through\nsetup, switching, and saved logins.','/welcome.html'],
  ['small-promo-tile.png',440,280], ['marquee-promo-tile.png',1400,560]
];
const styles = `*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{font-family:Arial,sans-serif;background:#f2f5ed;color:#214832}.brand{display:flex;align-items:center;gap:14px;font-size:27px;font-weight:700;letter-spacing:-1px}.brand img{width:48px;height:48px}.canvas{position:relative;width:1280px;height:800px;background:radial-gradient(ellipse at 95% 30%,#dcebcf 0%,#f2f5ed 60%)}.brand{position:absolute;left:70px;top:52px}.copy{position:absolute;left:70px;top:224px;width:570px}.eyebrow{font-size:12px;letter-spacing:2.3px;font-weight:700;color:#527d54;margin-bottom:25px}h1{font-size:59px;line-height:1.04;letter-spacing:-2.6px;white-space:pre-line;margin:0 0 28px}p{font-size:20px;line-height:1.6;color:#60745f;white-space:pre-line;margin:0}.foot{position:absolute;bottom:44px;left:70px;font-size:12px;color:#73836e}.product{position:absolute;left:734px;top:62px;width:422px;height:680px;background:#f8faf8;border:1px solid #cbd9c4;border-radius:18px;box-shadow:0 24px 70px #234d3420;overflow:hidden}.product iframe{display:block;width:420px;height:678px;border:0}.guide .copy{top:155px;width:550px}.guide h1{font-size:53px}.guide .product{left:610px;top:185px;width:608px;height:482px}.guide iframe{width:1280px;height:1010px;transform:scale(.475);transform-origin:0 0}.guide .foot{bottom:38px}.promo{position:relative;background:#235740;color:#fff;overflow:hidden}.promo:after{content:'';position:absolute;border:1px solid #78a98455;width:530px;height:530px;right:-135px;top:-75px;border-radius:50%;pointer-events:none}.promo .wordmark{font-weight:700;letter-spacing:-1px}.small{width:440px;height:280px;padding:34px}.small img{width:52px;height:52px;display:block;margin-bottom:20px}.small .wordmark{font-size:36px;line-height:1.1}.small p{color:#c5ddc4;font-size:17px;line-height:1.45;margin-top:13px}.marquee{width:1400px;height:560px;padding:70px 88px}.marquee .wordmark{font-size:29px;display:flex;align-items:center;gap:13px}.marquee .wordmark img{width:48px;height:48px}.marquee h1{font-size:76px;margin-top:54px;letter-spacing:-3px}.marquee p{font-size:22px;color:#c5ddc4;margin-top:22px}.switchmark{position:absolute;right:142px;top:115px;width:300px;height:300px;transform:rotate(-8deg);border-radius:72px;box-shadow:0 30px 60px #0b382a44;border:1px solid #80b89144}.marquee:after{right:30px;top:12px}.promo img{position:relative;z-index:1}`;
function artwork(index) {
 const spec=specs[index]; let content;
 if(index<5)content=`<div class="canvas ${index===4?'guide':''}"><div class="brand"><img src="/icons/icon-128.png" alt="">Switchboard</div><div class="copy"><div class="eyebrow">${spec[3]}</div><h1>${spec[4]}</h1><p>${spec[5]}</p></div><div class="product"><iframe src="${spec[6]}" title="Switchboard interface"></iframe></div><div class="foot">Chrome edition · Example accounts${index===2?' · Keep cookie exports private':''}</div></div>`;
 else if(index===5)content='<div class="promo small"><img src="/icons/icon-128.png" alt=""><div class="wordmark">Switchboard</div><p>Your accounts.<br>One browser.</p></div>';
 else content='<div class="promo marquee"><div class="wordmark"><img src="/icons/icon-128.png" alt="">Switchboard</div><h1>Your accounts.<br>One familiar place.</h1><p>Save logins. Switch accounts. Stay organized.</p><img class="switchmark" src="/icons/icon-128.png" alt=""></div>';
 return `<!doctype html><html><head><meta charset="utf-8"><title>${spec[0]}</title><style>${styles}</style></head><body>${content}</body></html>`;
}
const mock=`const data={mode:'chrome',domain:'dola.com',sites:['dola.com','example.com','example.org'],active:'personal',pending:null,accounts:[{id:'personal',name:'Personal',count:12,savedAt:1788763200000},{id:'work',name:'Work',count:9,savedAt:1788759600000},{id:'project',name:'Side project',count:7,savedAt:1788756000000}]};globalThis.chrome={permissions:{contains:async()=>true,request:async()=>true},storage:{local:{get:async()=>({lastSite:'dola.com'}),set:async()=>{}}},runtime:{getURL:p=>'/'+p,sendMessage:async m=>({ok:true,data})}};Date.now=()=>1788763260000;`;
const allowed=new Set(['popup.html','popup.js','popup.css','core.js','welcome.html','welcome.js','welcome.css','privacy.html']);
http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/capture'&&req.method==='POST'){
   const index=Number(u.searchParams.get('index'));if(!Number.isInteger(index)||!specs[index])throw new Error('Bad index');
   const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>12000000)throw new Error('Too large');chunks.push(chunk);}
   const bytes=Buffer.from(Buffer.concat(chunks).toString(),'base64');
   const spec=specs[index];const info=await sharp(bytes).metadata();
   if(info.width!==spec[1]||info.height!==spec[2])throw new Error('Wrong dimensions: '+info.width+'x'+info.height);
   await sharp(bytes).flatten({background:'#ffffff'}).removeAlpha().toColourspace('srgb').png({palette:false}).toFile(output+'/'+spec[0]);
   res.end('Saved '+spec[0]);return;
  }
  if(u.pathname==='/sink'){
   res.setHeader('Content-Type','text/html');res.end(`<!doctype html><title>Save store image</title><label>Image capture<textarea aria-label="Image capture"></textarea></label><p role="status">Ready</p><script>document.querySelector('textarea').addEventListener('paste',async e=>{e.preventDefault();const text=e.clipboardData.getData('text/plain');const r=await fetch('/capture?index=${u.searchParams.get('index')}',{method:'POST',body:text});document.querySelector('[role=status]').textContent=await r.text();});</script>`);return;
  }
  if(u.pathname.startsWith('/art/')){const index=Number(u.pathname.slice(5));if(!specs[index])throw new Error('Unknown image');res.setHeader('Content-Type','text/html');res.end(artwork(index));return;}
  if(u.pathname==='/mock.js'){res.setHeader('Content-Type','text/javascript');res.end(mock);return;}
  if(/^\/icons\/icon-(16|32|48|128)\.png$/.test(u.pathname)){res.setHeader('Content-Type','image/png');res.end(await readFile('dist/chrome'+u.pathname));return;}
  const path=u.pathname.slice(1);if(!allowed.has(path)){res.writeHead(404);res.end();return;}
  let data=await readFile('src/shared/'+path);
  res.setHeader('Content-Type',path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':'text/javascript');
  if(path==='popup.html')data=data.toString().replace('<script type="module" src="popup.js">','<script src="/mock.js"></script><script type="module" src="popup.js">');
  res.end(data);
 }catch(error){res.writeHead(500);res.end(error.message);}
}).listen(4174,'127.0.0.1',()=>console.log('Store artwork: http://127.0.0.1:4174/art/0'));
