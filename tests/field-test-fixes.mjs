import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './runtime.mjs';

const text = api => api.calls.filter(c => c[0] === 'game' && c[1] === 'fillText').map(c => c[2]);
const place = (api,c,r) => Object.assign(api.get('player'), {tx:c,ty:r,px:c*16,py:r*16,moving:false});
const step = (api,key) => {
  api.get('player').dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[key];
  api.emit('window','keydown',{key}); api.tick();
  api.emit('window','keyup',{key}); api.tick(25);
};

export function registerFieldTests(format, options) {
  const check = (name, fn) => test(`${format}: field report: ${name}`, async () => fn(await loadGame(options)));

  check('all nine tools include visible, tappable fertilizer and inventory tracks purchases', api => {
    api.call('pressB'); api.get('shop').idx=5; api.game.commerce.shopBuy();
    assert.equal(api.get('state').fertilizer,1);
    for (const size of [[1280,720],[390,844],[844,390]]) {
      api.resize(...size); api.get('menu').open=true; api.get('menu').tab=0; api.get('menu').idx=0; api.get('menu').top=0;
      api.render();
      assert.ok(text(api).includes('肥料'),'fertilizer must be visible without scrolling at common sizes');
      const G=api.call('panelGeom');
      api.click(G.X+25,G.Y+18+8*api.game.panels.menuRowHeight()+5);
      assert.equal(api.get('state').tool,'fertilizer');
      assert.equal(api.get('menu').open,false);
    }
    api.call('toggleMenu'); api.get('menu').tab=1;
    const inventory=api.call('menuItems');
    assert.ok(inventory.some(row => row.label === '肥料' && row.meta === '×1'));
    assert.ok(!inventory.some(row => row.label.includes('背包是空的')));
    api.get('state').sprinkler=true;
    assert.ok(api.call('menuItems').some(row => row.label === '灑水器' && row.meta === '已裝備'));
    api.resize(2560,720); api.get('menu').tab=0; api.get('menu').idx=8; api.render();
    assert.ok(text(api).includes('肥料'));
    assert.ok(text(api).some(s => /↑↓ 捲動 .*\/9/.test(s)));
  });

  check('world labels are composited below panels and clipped below HUD', api => {
    api.call('enterShop');
    for (const mode of ['dialogue','shop','menu']) {
      api.get('menu').open=mode==='menu'; api.get('shop').open=mode==='shop';
      api.get('dlg').active=mode==='dialogue'; api.call('pressA');
      api.render();
      const composites=api.calls.map((c,i) => c[0]==='game' && c[1]==='drawImage' ? i : -1).filter(i=>i>=0);
      assert.equal(composites.length,2);
      for (const [index,call] of api.calls.entries()) {
        if (call[0]==='game' && call[1]==='fillText' && ['種 子 商 店','出口'].includes(call[2])) {
          assert.ok(index>composites[0] && index<composites[1]);
        }
      }
      assert.ok(api.calls.some(c => c[0]==='game' && c[1]==='clip'));
      const hudIndex=api.calls.findIndex(c => c[0]==='game' && c[1]==='fillText' && c[2]==='第1天');
      assert.ok(hudIndex>composites[1]);
    }
  });

  check('tilling has distinct shapes and water markers reflect only the current tile state', api => {
    const p=api.call('plotAt',2,8);
    api.call('pressB'); place(api,2,7); api.get('player').dir='down';
    api.render(); const before=api.calls.filter(c=>c[0]==='scene-0' && c[1]==='fillRect').length;
    api.call('pressA'); assert.equal(p.tilled,true);
    api.render(); const after=api.calls.filter(c=>c[0]==='scene-0' && c[1]==='fillRect').length;
    assert.notEqual(after,before,'grass tufts and furrows have distinct geometry');
    const soil=api.imageElements[Object.keys(api.sandbox.PixelFarm.assetSources).indexOf('tile_soil')];
    assert.ok(api.calls.some(c=>c[0]==='scene-0' && c[1]==='drawImage' && c[2]===`image:${soil.imageHash}` && c[3]===32 && c[4]===128));
    api.call('pressB'); api.key('4'); api.call('pressA');
    api.render();
    assert.ok(api.calls.some(c => c[1]==='fillStyle' && c[2]==='#5aa8dd'));
    api.call('pressB'); api.key('2'); api.call('pressA'); api.render();
    assert.equal(p.watered,true);
    assert.ok(!api.calls.some(c => c[1]==='fillStyle' && c[2]==='#5aa8dd'));
    assert.ok(api.calls.some(c => c[1]==='fillStyle' && c[2]==='#7fd8d0'));
    api.call('pressB'); api.call('pressA');
    assert.equal(api.get('dlg').text,'今天已經澆過水了');
    Object.assign(api.call('plotAt',3,8),{tilled:true,crop:'carrot',growth:0,watered:false});
    api.render();
    const blueRects=[]; let fill;
    for (const c of api.calls) {
      if(c[0]!=='scene-0') continue;
      if(c[1]==='fillStyle') fill=c[2];
      if(c[1]==='fillRect' && fill==='#5aa8dd') blueRects.push(c.slice(2));
    }
    assert.deepEqual(blueRects,[[3*16+10,8*16+4,4,3]],'only the dry neighbouring tile has a droplet');
    api.get('state').rainy=true; api.render();
    assert.ok(!api.calls.some(c => c[1]==='fillStyle' && c[2]==='#5aa8dd'));
  });

  check('cats, dogs, chickens and cows yield to a single step without overlapping the player', api => {
    api.call('pressB');
    const animals=api.get('animals');
    for (const kind of ['cat','dog','chicken','cow']) {
      const a=animals.find(a=>a.kind===kind);
      api.set('animals',[a]); place(api,15,5);
      Object.assign(a,{x:16*16+8,y:5*16+8,tx:16*16+8,ty:5*16+8,wait:10000});
      api.get('player').dir='right';
      api.emit('window','keydown',{key:'ArrowRight'}); api.tick();
      api.emit('window','keyup',{key:'ArrowRight'});
      assert.equal(api.get('player').tx,15,'the animal must move naturally before the step starts');
      for(let i=0;i<65;i++) {
        api.tick();
        assert.ok(Math.hypot(a.x-(api.get('player').px+8),a.y-(api.get('player').py+8))>=api.game.world.animalRadius(a)+4,kind+' must not overlap the player');
      }
      assert.equal(api.get('player').tx,16,kind+' must let a single tap through');
      assert.equal(api.get('player').moving,false);
      assert.ok(Math.hypot(a.x-(16*16+8),a.y-(5*16+8))>=api.game.world.animalRadius(a)+4);
      api.set('animals',[]);
    }
    api.set('animals',[]); place(api,15,5); step(api,'ArrowRight');
    assert.equal(api.get('player').tx,16);
  });

  check('pets leave roads instead of waiting, while yielding respects crops, fences and a changed direction', api => {
    api.call('pressB');
    const dog=api.get('animals').find(a=>a.kind==='dog'); api.set('animals',[dog]);
    place(api,5,5); api.get('player').dir='right';
    Object.assign(dog,{x:6*16+8,y:5*16+8,tx:6*16+8,ty:5*16+8,wait:10000});
    api.emit('window','keydown',{key:'ArrowRight'}); api.tick(); api.emit('window','keyup',{key:'ArrowRight'});
    api.key('ArrowUp'); api.tick(70);
    assert.equal(api.get('player').tx,5,'turning cancels the queued step');
    assert.equal(api.get('player').ty,5);
    for(let i=0;i<400;i++) {
      api.tick();
      assert.equal(api.game.world.isPlot(Math.floor(dog.x/16),Math.floor(dog.y/16)),false);
      assert.equal(api.game.world.isSolid(Math.floor(dog.x/16),Math.floor(dog.y/16)),false);
      if(Math.hypot(dog.tx-dog.x,dog.ty-dog.y)<3) assert.equal(api.game.world.isPath(Math.floor(dog.x/16),Math.floor(dog.y/16)),false);
    }
  });

  check('walking through a busy pen clears multiple animals and opening a menu cancels a delayed step', api => {
    api.call('pressB');
    const livestock=api.get('animals').filter(a=>a.zone==='pen'); api.set('animals',livestock);
    livestock.forEach((a,i)=>Object.assign(a,{x:(14+i)*16+8,y:88,tx:(14+i)*16+8,ty:88,wait:10000}));
    place(api,13,5); api.get('player').dir='right';
    api.emit('window','keydown',{key:'ArrowRight'});
    for(let i=0;i<200;i++) {
      api.tick();
      for(const a of livestock) assert.ok(Math.hypot(a.x-api.get('player').px-8,a.y-api.get('player').py-8)>=api.game.world.animalRadius(a)+4);
    }
    api.emit('window','keyup',{key:'ArrowRight'}); api.tick(25);
    assert.equal(api.get('player').tx,17,'animals must clear the entrance and the interior route');
    assert.equal(api.get('player').ty,5);
    const a=livestock[0]; api.set('animals',[a]); place(api,15,5);
    Object.assign(a,{x:264,y:88,tx:264,ty:88,wait:10000});
    api.emit('window','keydown',{key:'ArrowRight'}); api.tick(); api.emit('window','keyup',{key:'ArrowRight'});
    api.call('toggleMenu'); api.tick(5); api.call('pressB'); api.tick(80);
    assert.equal(api.get('player').tx,15,'closing a menu must not resume an old queued step');
  });

  check('roaming pets stay out of plots and livestock stay inside the pen', api => {
    api.call('pressB');
    for(let i=0;i<2400;i++) {
      api.game.animals.updateAnimals(.05);
      for(const a of api.get('animals')) {
        const radius=api.game.world.animalRadius(a);
        if(a.zone==='farm') {
          const nearestX=Math.max(16,Math.min(a.x,8*16));
          const nearestY=Math.max(7*16,Math.min(a.y,11*16));
          assert.ok(Math.hypot(a.x-nearestX,a.y-nearestY)>=radius);
        } else if(a.zone==='pen') {
          assert.ok(a.x-radius>=14*16 && a.x+radius<=18*16);
          assert.ok(a.y-radius>=4*16 && a.y+radius<=7*16);
        }
      }
    }
  });

  check('the marked west gate is passable in both directions and all other fence tiles block', api => {
    api.call('pressB'); api.set('animals',[]); place(api,12,5);
    step(api,'ArrowRight'); assert.equal(api.get('player').tx,13);
    step(api,'ArrowRight'); assert.equal(api.get('player').tx,14);
    step(api,'ArrowLeft'); step(api,'ArrowLeft'); assert.equal(api.get('player').tx,12);
    for(let c=13;c<=18;c++) assert.equal(api.game.world.isFence(c,7),true);
    for(let r=3;r<=7;r++) assert.equal(api.game.world.isFence(13,r),r!==5);
    api.render(); assert.ok(text(api).includes('入口'));
  });

  check('all seven southern plots can be tilled, planted, watered and harvested', api => {
    api.call('pressB'); api.get('state').seeds.wheat=7;
    for(let c=1;c<=7;c++) {
      place(api,c,9); api.get('player').dir='down';
      for(const key of ['1','4','2']) { api.call('pressB'); api.key(key); api.call('pressA'); }
      const p=api.call('plotAt',c,10);
      assert.equal(p.crop,'wheat'); assert.equal(p.watered,true);
      assert.equal(api.game.world.isSolid(c,10),false);
      p.growth=2; api.call('pressB'); api.call('pressA'); assert.equal(p.crop,null);
    }
    assert.equal(api.get('state').produce.wheat,7);
  });

  check('daily prices stay stable within a day and fluctuate over thirty days', api => {
    const daily=[];
    for(let d=1;d<=30;d++) {
      api.get('state').day=d;
      const prices=api.sandbox.PixelFarm.config.PRICE_KEYS.map(id=>api.call('todayPrice',id));
      assert.deepEqual(prices,api.sandbox.PixelFarm.config.PRICE_KEYS.map(id=>api.call('todayPrice',id)));
      daily.push(Array.from(prices));
    }
    for(let i=0;i<6;i++) assert.ok(new Set(daily.map(p=>p[i])).size>1);
    assert.equal(daily[2][0],29); assert.equal(daily[2][5],18);
  });

  check('buying a sprinkler waters only planted orthogonal neighbours and cannot be bought twice', api => {
    api.get('state').coins=500; api.get('shop').idx=6; api.game.commerce.shopBuy();
    assert.equal(api.get('state').coins,320); assert.equal(api.get('state').sprinkler,true);
    api.game.commerce.shopBuy(); assert.equal(api.get('state').coins,320);
    api.call('pressB'); place(api,3,7); api.get('player').dir='down';
    for(const [c,r] of [[3,8],[3,7],[3,9],[2,8],[4,8],[2,7]]) {
      Object.assign(api.call('plotAt',c,r),{tilled:true,crop:'carrot',growth:0,watered:false});
    }
    api.key('2'); api.call('pressA');
    for(const [c,r] of [[3,8],[3,7],[3,9],[2,8],[4,8]]) assert.equal(api.call('plotAt',c,r).watered,true);
    assert.equal(api.call('plotAt',2,7).watered,false);
  });
}
