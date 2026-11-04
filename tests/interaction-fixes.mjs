import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './runtime.mjs';

function textOnScreen(api) {
  return api.calls.filter(call => call[0] === 'game' && call[1] === 'fillText').map(call => call[2]);
}

function dialogueLines(api) {
  api.render();
  const view = api.view();
  return api.calls.filter(call => call[0] === 'game' && call[1] === 'fillText'
    && call[3] === 10 * view.scaleX
    && [view.height - 28, view.height - 15].some(y => call[4] === y * view.scaleY))
    .map(call => call[2]).join('');
}

function direction(api, name) {
  api.emit(`dpad-${name}`, 'pointerdown');
  api.emit(`dpad-${name}`, 'pointerup');
}

function pointer(api, type, x, y, id=1, pointerType='touch') {
  const rect = api.sandbox.document.getElementById('game').getBoundingClientRect();
  const view = api.view();
  api.emit('game', type, { pointerType, pointerId:id, clientX:x/view.width*rect.width, clientY:y/view.height*rect.height });
}

export function registerInteractionTests(format, options) {
  const check = (name, fn) => test(`${format}: ${name}`, () => fn(loadGame(options)));

  check('shop START menu is visible on every tab, pauses movement, and closes', api => {
    api.call('enterShop');
    api.emit('btnStart','click');
    assert.equal(api.get('menu').open,true);
    const before = JSON.stringify(api.get('player'));
    for (let tab=0;tab<5;tab++) {
      api.get('menu').tab=tab;
      api.render();
      assert.ok(textOnScreen(api).includes('道具'));
      assert.ok(textOnScreen(api).includes('背包'));
      assert.ok(textOnScreen(api).includes(api.call('menuItems')[0].label));
      assert.ok(!textOnScreen(api).includes('種 子 商 店'),'world text must not draw over the menu');
      assert.ok(!textOnScreen(api).includes('出口'));
    }
    api.tick(10);
    assert.equal(JSON.stringify(api.get('player')),before);
    api.emit('btnB','click');
    assert.equal(api.get('menu').open,false);
    assert.equal(api.get('scene'),'shop');
  });

  check('portrait price board and long Unicode dialogue render every character across pages', api => {
    api.resize(390,844,2);
    for (const text of [api.call('priceBoardText'), '🌾小農場的每日記事：'.repeat(12)]) {
      api.call('say',text);
      let collected='',pages=0;
      while (api.get('dlg').active && pages++ < 20) {
        api.tick(200);
        const shown=api.get('dlg').shown;
        api.tick(5);
        assert.equal(api.get('dlg').shown,shown,'typing must stop at the page boundary');
        collected += dialogueLines(api);
        api.emit('btnA','click');
      }
      assert.equal(collected,text);
      assert.ok(pages>1);
      assert.equal(api.get('dlg').active,false);
    }
  });

  check('A reveals one page, advances, and closes only after the final page; B cancels', api => {
    api.resize(390,844,2);
    const text=api.call('priceBoardText');
    api.call('say',text);
    api.key('z');
    const first=dialogueLines(api);
    assert.equal(first,text.slice(0,32));
    api.key('z',true);
    assert.equal(api.get('dlg').pageStart,0);
    api.emit('btnA','click');
    assert.equal(api.get('dlg').pageStart,32);
    assert.equal(api.get('dlg').active,true);
    api.emit('btnA','click');
    assert.equal(dialogueLines(api),text.slice(32));
    api.emit('btnA','click');
    assert.equal(api.get('dlg').active,false);
    api.call('say',text); api.call('pressB');
    assert.equal(api.get('dlg').active,false);
    api.call('say','新的對話');
    assert.equal(api.get('dlg').pageStart,0);
  });

  check('rotating between dialogue pages preserves all remaining text', api => {
    api.resize(390,844,2);
    const text='0123456789甲乙丙丁戊己庚辛壬癸'.repeat(5);
    api.call('say',text); api.call('pressA');
    let collected=dialogueLines(api);
    api.call('pressA');
    api.resize(844,390,2);
    for (let i=0;i<10 && api.get('dlg').active;i++) {
      api.call('pressA'); collected+=dialogueLines(api); api.call('pressA');
    }
    assert.equal(collected,text);
    assert.equal(api.get('dlg').active,false);
  });

  check('mobile directions navigate tabs and reach the final help row without moving the player', api => {
    api.resize(390,844,2);
    api.emit('btnStart','click');
    const before=JSON.stringify(api.get('player'));
    direction(api,'right'); direction(api,'right'); direction(api,'right');
    assert.equal(api.get('menu').tab,3);
    for(let i=0;i<15;i++) direction(api,'down');
    api.render();
    assert.equal(api.get('menu').idx,15);
    assert.equal(api.get('menu').top,8);
    assert.ok(textOnScreen(api).includes('雞會下蛋，撿蛋也能賣'));
    assert.equal(JSON.stringify(api.get('player')),before);
    direction(api,'left');
    assert.equal(api.get('menu').tab,2);
    assert.equal(api.get('menu').idx,0);
  });

  check('held mobile navigation repeats and pointer cancellation stops it', api => {
    api.emit('btnStart','click');
    api.get('menu').tab=3;
    api.emit('dpad-down','pointerdown'); api.tick(40);
    assert.ok(api.get('menu').idx>1);
    api.emit('dpad-down','pointercancel');
    const index=api.get('menu').idx;
    api.tick(40);
    assert.equal(api.get('menu').idx,index);
    api.call('pressB'); api.tick(25);
    assert.equal(api.get('player').moving,false);
  });

  check('mobile directions select shop and market rows for A to activate', api => {
    api.call('enterShop'); api.call('pressB'); api.call('interact',7,3);
    direction(api,'down'); api.emit('btnA','click');
    assert.equal(api.get('state').seeds.carrot,3);
    assert.equal(api.get('state').coins,105);
    api.call('pressB'); api.call('exitShop');
    Object.assign(api.get('player'),{tx:11,ty:4,px:176,py:64});
    api.get('state').produce.wheat=1; api.get('state').produce.egg=1;
    api.call('interact',2,11); direction(api,'down'); api.emit('btnA','click');
    assert.equal(api.get('state').produce.wheat,1);
    assert.equal(api.get('state').produce.egg,0);
  });

  check('touch swipe scrolls help to both bounds without activating an item', api => {
    api.resize(390,844,2); api.call('toggleMenu'); api.get('menu').tab=3;
    api.render();
    const G=api.call('panelGeom'),x=G.X+30,y=G.Y+70;
    pointer(api,'pointerdown',x,y);
    pointer(api,'pointermove',x,y-120);
    pointer(api,'pointerup',x,y-120);
    api.render();
    assert.equal(api.get('menu').top,8);
    assert.ok(textOnScreen(api).includes('雞會下蛋，撿蛋也能賣'));
    assert.equal(api.get('menu').open,true);
    pointer(api,'pointerdown',x,y);
    pointer(api,'pointermove',x,y+120);
    pointer(api,'pointerup',x,y+120);
    api.render();
    assert.equal(api.get('menu').top,0);
    assert.ok(textOnScreen(api).includes('移動：方向鍵 / WASD'));
  });

  check('swiping and cancelling never select tools, while an ordinary touch tap does', api => {
    api.resize(390,844,2); api.call('toggleMenu'); api.render();
    const G=api.call('panelGeom'),x=G.X+30,y=G.Y+60;
    pointer(api,'pointerdown',x,y);
    pointer(api,'pointermove',x,y-50);
    pointer(api,'pointerup',x,y-50);
    assert.equal(api.get('menu').open,true);
    assert.equal(api.get('state').tool,'hoe');
    pointer(api,'pointerdown',x,G.Y+23);
    pointer(api,'pointercancel',x,G.Y+23);
    pointer(api,'pointerup',x,G.Y+23);
    assert.equal(api.get('state').tool,'hoe');
    pointer(api,'pointerdown',x,G.Y+23);
    assert.equal(api.get('menu').open,true,'touch activation waits for release');
    pointer(api,'pointerup',x,G.Y+23);
    assert.equal(api.get('state').tool,'can');
    assert.equal(api.get('menu').open,false);
  });

  for (const pointerType of ['mouse','touch']) {
    check(`${pointerType} scene taps cannot till, plant, water, harvest, fertilize, or collect eggs`, api => {
      api.call('pressB');
      api.resize(390,844,2);
      api.get('state').fertilizer=5;
      const cases = [
        { tool:'hoe', crop:null, tilled:false, growth:0, watered:false },
        { tool:'seed', crop:null, tilled:true, growth:0, watered:false },
        { tool:'can', crop:'wheat', tilled:true, growth:0, watered:false },
        { tool:'basket', crop:'wheat', tilled:true, growth:2, watered:true },
        { tool:'fertilizer', crop:'wheat', tilled:true, growth:0, watered:false }
      ];
      for (const {tool,...plot} of cases) {
        api.call('applyToolOpt',{tool,crop:'wheat'});
        Object.assign(api.call('plotAt',1,7),plot);
        api.render();
        const before=api.snapshot(), view=api.view();
        const x=24-view.camera.x, y=136-view.camera.y;
        pointer(api,'pointerdown',x,y,1,pointerType);
        pointer(api,'pointerup',x,y,1,pointerType);
        assert.deepEqual(api.snapshot(),before,`${tool} must require A`);
      }
      api.get('eggs').push({c:2,r:7});
      api.render();
      const before=api.snapshot(), view=api.view();
      pointer(api,'pointerdown',40-view.camera.x,136-view.camera.y,1,pointerType);
      pointer(api,'pointerup',40-view.camera.x,136-view.camera.y,1,pointerType);
      assert.deepEqual(api.snapshot(),before);
    });

    check(`${pointerType} scene taps cannot open objects or advance dialogue`, api => {
      api.call('pressB');
      api.resize(320,1200,1);
      for (const {c,r} of [{c:3,r:4},{c:8,r:8},{c:12,r:9},{c:2,r:11},{c:8,r:11},{c:15,r:12}]) {
        const row=r===12?10:r+1;
        Object.assign(api.get('player'),{tx:c,ty:row,px:c*16,py:row*16,dir:'up',moving:false});
        api.render();
        const before=api.snapshot(), view=api.view();
        const x=c*16+8-view.camera.x,y=r*16+24-view.camera.y;
        assert.ok(x>0 && x<view.width && y>16 && y<view.height,'test target must be visible');
        pointer(api,'pointerdown',x,y,1,pointerType);
        pointer(api,'pointerup',x,y,1,pointerType);
        assert.deepEqual(api.snapshot(),before);
      }
      Object.assign(api.get('player'),{tx:11,ty:3,px:176,py:48});
      api.render();
      const before=api.snapshot();
      pointer(api,'pointerdown',20,40,1,pointerType);
      assert.deepEqual(api.snapshot(),before,'standing on the shop door still requires A');
      api.emit('btnA','click');
      assert.equal(api.get('scene'),'shop');
      const dialogue=JSON.stringify(api.get('dlg'));
      pointer(api,'pointerdown',20,40,1,pointerType);
      pointer(api,'pointerup',20,40,1,pointerType);
      assert.equal(JSON.stringify(api.get('dlg')),dialogue);
      api.emit('btnA','click');
      assert.ok(api.get('dlg').shown>0);
      api.emit('btnB','click');
      assert.equal(api.get('dlg').active,false);
      api.call('exitShop');
      api.call('say',api.call('priceBoardText'));
      const farmDialogue=JSON.stringify(api.get('dlg'));
      pointer(api,'pointerdown',20,40,1,pointerType);
      assert.equal(JSON.stringify(api.get('dlg')),farmDialogue);
    });
  }

  check('directions and A still operate only on the faced tile', api => {
    api.call('pressB');
    api.emit('window','keydown',{key:'ArrowLeft'}); api.tick();
    api.emit('window','keyup',{key:'ArrowLeft'}); api.tick(25);
    assert.equal(api.get('player').tx,4);
    api.emit('dpad-down','pointerdown'); api.tick();
    api.emit('dpad-down','pointerup'); api.tick(25);
    assert.equal(api.get('player').ty,7);
    assert.equal(api.get('player').dir,'down');
    api.emit('btnA','click');
    assert.equal(api.call('plotAt',4,8).tilled,true);
    assert.equal(api.call('plotAt',1,7).tilled,false);
    api.emit('btnB','click'); api.key('4'); api.key('z');
    assert.equal(api.call('plotAt',4,8).crop,'wheat');
    api.key('x'); api.key('2'); api.emit('btnA','click');
    assert.equal(api.call('plotAt',4,8).watered,true);
    api.emit('btnB','click');
    api.call('plotAt',4,8).growth=2;
    api.key('z');
    assert.equal(api.get('state').produce.wheat,1);
    assert.equal(api.call('plotAt',4,8).crop,null);
  });
}
