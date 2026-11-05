// Optional real-browser checks without npm dependencies. Uses an installed Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { root, build } from '../scripts/build.mjs';

const browser=process.env.BROWSER_PATH || (process.platform === 'linux' ? '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
const windowsBrowser=process.platform === 'linux' && browser.endsWith('.exe');
const directory=await fs.mkdtemp(path.join(windowsBrowser ? root : os.tmpdir(),windowsBrowser ? '.browser-smoke-' : 'pixel-farm-browser-'));
const browserPath=file=>windowsBrowser ? execFileSync('wslpath',['-w',file],{encoding:'utf8'}).trim() : file;
const server=http.createServer(async (req,res) => {
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(path.resolve(root)+path.sep)) { res.writeHead(403).end(); return; }
    const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'}[path.extname(file)];
    res.setHeader('Content-Type',type || 'application/octet-stream'); res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
server.listen(0,'127.0.0.1'); await once(server,'listening');
const child=spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  '--disable-extensions','--disable-background-networking','--remote-debugging-port=0',
  `--user-data-dir=${browserPath(directory)}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try {
  let port;
  for(let i=0;i<100;i++) {
    try { port=Number((await fs.readFile(path.join(directory,'DevToolsActivePort'),'utf8')).split('\n')[0]); break; }
    catch { await delay(100); }
  }
  assert.ok(port,'Chromium did not expose its debugging endpoint');
  console.log('Chromium debugging endpoint ready.');
  const targets=await (await fetch(`http://127.0.0.1:${port}/json`,{signal:AbortSignal.timeout(5000)})).json();
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await once(socket,'open',{signal:AbortSignal.timeout(5000)});
  const pending=new Map(); let id=0;
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    const waiter=pending.get(message.id);
    if(waiter) { pending.delete(message.id); message.error ? waiter.reject(message.error) : waiter.resolve(message.result); }
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const next=++id;
    const timer=setTimeout(()=>{pending.delete(next);reject(new Error('CDP timed out: '+method));},10000);
    pending.set(next,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});
    socket.send(JSON.stringify({id:next,method,params}));
  });
  const evaluate=async expression=>{
    const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Page.enable');
  console.log('Opening local game.');
  await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
  for(let i=0;i<100;i++) {
    if(await evaluate('window.PixelFarm?.game?.startup.phase === "ready"')) break;
    await delay(100);
  }
  assert.equal(await evaluate('window.PixelFarm?.game?.startup.phase'),'ready');
  console.log('Game ready.');
  // Freeze animation while capturing state and pixels; no assets or gameplay change.
  await evaluate('window.requestAnimationFrame=()=>0'); await delay(50);
  const screenshot=async name=>{
    const {data}=await send('Page.captureScreenshot',{format:'png'});
    await fs.writeFile(path.join(directory,name+'.png'),Buffer.from(data,'base64'));
  };
  for(const [width,height] of [[1280,720],[390,844],[844,390],[320,320],[2560,720]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    for(const scale of [.8,1,1.2,1.4]) {
      const result=await evaluate(`(() => {
        const g=PixelFarm.game; g.surface.fitScreen(); g.store.scene='farm'; g.store.menu.open=false; g.store.shop.open=false;
        g.store.market.open=false; g.dialogue.say('歡迎來到像素農場！北邊有商店、南邊有市集，按 START 看說明');
        g.store.dialogue.shown=999; document.getElementById('padbar').style.setProperty('--control-scale','${scale}'); g.surface.fitScreen();
        g.renderer.draw();
        const rect=g.surface.canvas.getBoundingClientRect();
        const bottom=rect.top+60/g.surface.view.height*rect.height;
        const playerBottom=rect.top+(16+g.store.player.py+16-g.surface.view.camera.y)/g.surface.view.height*rect.height;
        return {bottom,worldBottom:rect.bottom,playerBottom,top:rect.top+20/g.surface.view.height*rect.height,
          controls:[...document.querySelectorAll('.padbar button')].map(b=>{const r=b.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};}),
          overflow:document.documentElement.scrollWidth>innerWidth || document.documentElement.scrollHeight>innerHeight};
      })()`);
      assert.equal(result.overflow,false,`${width}x${height}: page overflow`);
      for(const control of result.controls) {
        assert.ok(control.top>=result.bottom || control.bottom<=result.top,`${width}x${height} at ${scale}: controls overlap dialogue`);
        assert.ok(control.left>=0 && control.right<=width && control.top>=0 && control.bottom<=height);
        assert.ok(control.bottom<=result.worldBottom,`${width}x${height}: controls must stay inside the screen`);
        assert.ok(control.left>=24 && control.right<=width-24,`${width}x${height}: controls need a safe side margin`);
        assert.ok(control.top>=result.playerBottom,`${width}x${height}: controls hide the player`);
      }
    }
    if(width===390 || width===1280){
      await screenshot(`dialogue-${width}`);
      await evaluate("PixelFarm.game.dialogue.notify('小麥 +1');PixelFarm.game.renderer.draw()");
      await screenshot(`notice-${width}`);
    }
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const layers=await evaluate(`(() => {
    const g=PixelFarm.game; g.surface.fitScreen(); g.commerce.enterShop();
    const original=g.surface.txt;
    const crop=(x,y,w,h)=>Array.from(g.surface.dctx.getImageData(Math.round(x*g.surface.view.scaleX),Math.round(y*g.surface.view.scaleY),Math.floor(w*g.surface.view.scaleX),Math.floor(h*g.surface.view.scaleY)).data).join(',');
    const results=[];
    for(const mode of ['shop','dialogue']) {
      g.store.shop.open=mode==='shop'; g.store.dialogue.active=mode==='dialogue'; g.store.dialogue.shown=999;
      g.renderer.draw(); const G=mode==='shop'?g.panels.panelGeom():{X:4,Y:20,W:g.surface.view.width-8,H:40};
      const before=crop(G.X,G.Y,G.W,G.H);
      g.surface.txt=function(s,...args){if(s!=='種 子 商 店' && s!=='出口') original(s,...args);};
      g.renderer.draw(); results.push(before===crop(G.X,G.Y,G.W,G.H)); g.surface.txt=original;
    }
    return results;
  })()`);
  assert.deepEqual(layers,[true,true],'world lettering must not affect pixels inside opaque panels');
  await screenshot('shop-dialogue');
  await evaluate(`(() => {
    const g=PixelFarm.game; g.commerce.exitShop(); g.input.pressB();
    Object.assign(g.store.player,{tx:7,ty:9,px:112,py:144,moving:false});
    Object.assign(g.store.plotAt(2,9),{tilled:true,crop:'wheat',growth:0,watered:false});
    Object.assign(g.store.plotAt(3,9),{tilled:true,crop:'carrot',growth:1,watered:true});
    g.store.plotAt(4,9).tilled=true; g.renderer.draw();
  })()`);
  await screenshot('farm-status');
  await evaluate(`(() => {
    const g=PixelFarm.game; g.store.farm.fertilizer=1; g.menu.toggleMenu(); g.renderer.draw();
  })()`);
  await screenshot('tools');
  await evaluate(`(() => {
    const g=PixelFarm.game; g.store.menu.open=false; g.store.dialogue.active=false; g.store.notice=null;
    g.store.farm.sprinkler=true;
    Object.assign(g.store.plotAt(2,9),{tilled:true,crop:'wheat',growth:0,watered:false});
    Object.assign(g.store.plotAt(3,9),{tilled:true,crop:'wheat',growth:0,watered:true});
    g.renderer.draw();
  })()`);
  await screenshot('watering-and-sprinkler');
  await evaluate(`(() => {
    const g=PixelFarm.game; g.regions.travel('market',11,7,'down'); g.store.journey.minute=780;
    g.renderer.draw();
  })()`);
  await screenshot('market-day');
  await evaluate('PixelFarm.game.store.journey.minute=1260;PixelFarm.game.renderer.draw()');
  await screenshot('market-night');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await evaluate(`(() => {
    const g=PixelFarm.game; g.surface.fitScreen(); g.store.menu.open=true; g.store.menu.tab=5; g.renderer.draw();
  })()`);
  await screenshot('map-mobile');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await evaluate('PixelFarm.game.regions.leaveMarket();PixelFarm.game.surface.fitScreen();PixelFarm.game.store.journey.minute=480');
  await evaluate(`(() => {
    const g=PixelFarm.game; g.store.menu.open=false;
    Object.assign(g.store.player,{tx:11,ty:4,px:176,py:64,dir:'right',moving:false});
    g.renderer.draw();
  })()`);
  await screenshot('landmarks');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await evaluate('PixelFarm.game.surface.fitScreen();PixelFarm.game.renderer.draw()');
  await screenshot('landmarks-mobile');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const yielded=await evaluate(`(() => {
    const g=PixelFarm.game; g.surface.fitScreen();
    Object.assign(g.store.player,{tx:5,ty:5,px:80,py:80,dir:'right',moving:false});
    const dog=g.store.animals.find(a=>a.kind==='dog');
    Object.assign(dog,{x:104,y:88,tx:104,ty:88,wait:10000});
    g.store.input.keys.arrowright=true; g.player.updatePlayer(.016); g.animals.updateAnimals(.016);
    g.store.input.keys.arrowright=false;
    for(let i=0;i<100;i++) { g.player.updatePlayer(.016); g.animals.updateAnimals(.016); }
    g.renderer.draw();
    return {c:g.store.player.tx,moving:g.store.player.moving,gap:Math.hypot(dog.x-g.store.player.px-8,dog.y-g.store.player.py-8)};
  })()`);
  assert.equal(yielded.c,6,'a dog on the road must yield to a single requested step');
  assert.equal(yielded.moving,false); assert.ok(yielded.gap>=8);
  const saved=await evaluate(`(() => {
    const g=PixelFarm.game; Object.assign(g.store.farm,{day:30,coins:119,fertilizer:2});
    g.store.menu.open=false; g.store.dialogue.active=false;
    return g.persistence.save();
  })()`);
  assert.equal(saved,true);
  await evaluate('window.__beforeSmokeReload=true');
  await send('Page.reload',{ignoreCache:true});
  let restored;
  for(let i=0;i<100;i++) {
    restored=await evaluate('!window.__beforeSmokeReload && window.PixelFarm?.game?.startup.phase === "ready" && PixelFarm.game.store.farm.day === 30');
    if(restored) break;
    await delay(100);
  }
  assert.equal(restored,true,'real browser reload must restore the saved day');
  assert.deepEqual(await evaluate('[PixelFarm.game.store.farm.coins,PixelFarm.game.store.farm.fertilizer]'),[119,2]);
  await evaluate(`(() => {
    const g=PixelFarm.game; g.input.pressB(); Object.assign(g.store.player,{tx:5,ty:6,px:80,py:96,dir:'down',moving:false});
  })()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft'});
  await delay(60);
  assert.deepEqual(await evaluate('[PixelFarm.game.store.player.tx,PixelFarm.game.store.player.ty,PixelFarm.game.store.player.dir]'),[5,6,'left']);
  const standalone=await build(path.join(directory,'standalone'));
  await send('Page.navigate',{url:windowsBrowser ? 'file:///' + browserPath(standalone).replaceAll('\\','/') : pathToFileURL(standalone).href});
  for(let i=0;i<100;i++) {
    if(await evaluate('location.protocol === "file:" && window.PixelFarm?.game?.startup.phase === "ready"')) break;
    await delay(100);
  }
  assert.equal(await evaluate('window.PixelFarm?.game?.startup.phase'),'ready');
  assert.equal(await evaluate('PixelFarm.game.store.farm.day'),1,'different locations own independent saves');
  assert.equal(await evaluate('PixelFarm.game.store.farm.day=17;PixelFarm.game.persistence.save()'),true);
  await evaluate('window.__beforeSmokeReload=true');
  await send('Page.reload',{ignoreCache:true});
  for(let i=0;i<100;i++) {
    if(await evaluate('!window.__beforeSmokeReload && window.PixelFarm?.game?.startup.phase === "ready" && PixelFarm.game.store.farm.day === 17')) break;
    await delay(100);
  }
  assert.equal(await evaluate('PixelFarm.game.store.farm.day'),17,'directly opened standalone HTML must retain its save');
  console.log('Browser checks passed: 5 viewport sizes × 4 button sizes; panel pixels, HTTP/file reload persistence, and tap-to-turn.');
  console.log('Screenshots: '+directory);
  await send('Browser.close').catch(()=>{});
} finally {
  socket?.close(); child.kill(); server.closeAllConnections(); server.close();
}
