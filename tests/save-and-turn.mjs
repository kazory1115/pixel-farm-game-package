import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './runtime.mjs';

const copy = value => JSON.parse(JSON.stringify(value));
const saveKey = 'pixelFarm.save.v1';
const position = api => [api.get('player').tx,api.get('player').ty,api.get('player').px,api.get('player').py];

export function registerSaveAndTurnTests(format, options) {
  const check = (name, fn) => test(`${format}: save and turn: ${name}`, async () => fn(await loadGame(options)));

  for (const device of ['keyboard','touch']) {
    check(`${device} taps turn in place; holding walks and a same-direction tap moves only one tile`, api => {
      api.call('pressB'); api.set('animals',[]);
      const down=() => device==='keyboard'?api.emit('window','keydown',{key:'ArrowLeft'}):api.emit('dpad-left','pointerdown');
      const up=() => device==='keyboard'?api.emit('window','keyup',{key:'ArrowLeft'}):api.emit('dpad-left','pointerup');
      const before=position(api);
      down(); api.tick(); up(); api.tick(15);
      assert.deepEqual(position(api),before); assert.equal(api.get('player').dir,'left');
      down(); api.tick(); up(); api.tick(25);
      assert.equal(api.get('player').tx,before[0]-1); assert.equal(api.get('player').moving,false);
      Object.assign(api.get('player'),{tx:5,ty:6,px:80,py:96,dir:'down',moving:false});
      down(); api.tick(7); assert.equal(api.get('player').tx,5,'short press only turns');
      api.tick(3); assert.equal(api.get('player').tx,4,'holding starts walking after turn delay');
      up(); api.tick(25); assert.equal(api.get('player').tx,4);
    });
  }

  check('turning changes the A target without changing the player tile', api => {
    api.call('pressB'); api.set('animals',[]);
    Object.assign(api.get('player'),{tx:3,ty:8,px:48,py:128,dir:'down',moving:false});
    api.emit('dpad-left','pointerdown'); api.tick(); api.emit('dpad-left','pointerup'); api.tick();
    api.call('pressA');
    assert.equal(api.call('plotAt',2,8).tilled,true);
    assert.equal(api.call('plotAt',3,9).tilled,false);
    assert.equal(api.get('player').tx,3); assert.equal(api.get('player').ty,8);
  });

  check('quick keyboard and touch taps between animation frames still turn in place', api => {
    api.call('pressB'); const before=position(api);
    api.key('ArrowLeft');
    assert.equal(api.get('player').dir,'left'); assert.deepEqual(position(api),before);
    api.emit('dpad-up','pointerdown'); api.emit('dpad-up','pointerup');
    assert.equal(api.get('player').dir,'up'); api.tick(25); assert.deepEqual(position(api),before);
  });

  check('auto-save reloads day, money, equipment, crops, goals, eggs, animals and position', async api => {
    api.call('pressB');
    Object.assign(api.get('state'),{day:30,coins:119,fertilizer:2,sprinkler:true,totalHarvest:11,totalEarned:320,eggsCollected:5});
    api.get('state').produce.tomato=3; api.get('state').seeds.pumpkin=2;
    api.get('state').goalsDone={g1:true,g2:true,g3:true};
    Object.assign(api.call('plotAt',2,8),{tilled:true,crop:'carrot',growth:2,watered:true});
    Object.assign(api.get('player'),{tx:7,ty:9,px:112,py:144,dir:'left',moving:false});
    api.get('eggs').push({c:14,r:5});
    api.tick(70);
    const raw=api.sandbox.localStorage.getItem(saveKey);
    assert.ok(raw,'the regular game loop must auto-save');
    const saved=JSON.parse(raw).data;
    const reloaded=await loadGame({...options,storage:new Map([[saveKey,raw]])});
    assert.deepEqual(copy(reloaded.get('state')),saved.farm);
    assert.deepEqual(copy(reloaded.get('plots')),saved.plots);
    assert.deepEqual(copy(reloaded.get('animals')),saved.animals);
    assert.deepEqual(copy(reloaded.get('eggs')),saved.eggs);
    assert.deepEqual(position(reloaded),[7,9,112,144]);
    assert.equal(reloaded.get('player').dir,'left');
    assert.equal(reloaded.get('player').moving,false);
    assert.equal(reloaded.get('menu').open,false);
    assert.match(reloaded.get('dlg').text,/接續第 30 天/);
  });

  check('manual save and page lifecycle save the latest changes; shop reload is playable', async api => {
    api.call('enterShop'); api.call('pressB'); api.call('toggleMenu'); api.get('menu').tab=4; api.get('menu').idx=3;
    api.call('menuActivate');
    assert.equal(api.call('menuItems')[3].meta,'已儲存');
    api.get('state').coins=77;
    api.emit('window','pagehide');
    let raw=api.sandbox.localStorage.getItem(saveKey);
    assert.equal(JSON.parse(raw).data.farm.coins,77);
    api.get('state').coins=78;
    api.sandbox.document.visibilityState='hidden'; api.emit('document','visibilitychange');
    raw=api.sandbox.localStorage.getItem(saveKey);
    assert.equal(JSON.parse(raw).data.farm.coins,78);
    const reloaded=await loadGame({...options,storage:new Map([[saveKey,raw]])});
    assert.equal(reloaded.get('scene'),'shop');
    assert.equal(reloaded.get('shop').open,false); assert.equal(reloaded.get('menu').open,false);
    reloaded.call('pressB'); reloaded.call('interact',7,8); assert.equal(reloaded.get('scene'),'farm');
  });

  check('a sleep interrupted by reload resumes the previous day; completed sleep saves the new morning', async api => {
    api.get('state').coins=119;
    Object.assign(api.call('plotAt',1,7),{tilled:true,crop:'wheat',growth:0,watered:true});
    api.call('sleep');
    const before=api.sandbox.localStorage.getItem(saveKey);
    api.emit('window','pagehide');
    assert.equal(api.sandbox.localStorage.getItem(saveKey),before);
    const reloaded=await loadGame({...options,storage:new Map([[saveKey,before]])});
    assert.equal(reloaded.get('state').day,1); assert.equal(reloaded.get('state').coins,119);
    assert.equal(reloaded.get('sleeping'),false);
    api.timers(1500);
    const morning=api.sandbox.localStorage.getItem(saveKey);
    const next=await loadGame({...options,storage:new Map([[saveKey,morning]])});
    assert.equal(next.get('state').day,2); assert.equal(next.call('plotAt',1,7).growth,1);
  });

  check('saving mid-step resumes on the destination grid with no stuck movement', async api => {
    api.call('pressB');
    api.emit('window','keydown',{key:'ArrowDown'}); api.tick(3); api.emit('window','keyup',{key:'ArrowDown'});
    assert.equal(api.get('player').moving,true);
    api.game.persistence.save();
    const raw=api.sandbox.localStorage.getItem(saveKey);
    const reloaded=await loadGame({...options,storage:new Map([[saveKey,raw]])});
    assert.deepEqual(position(reloaded),[5,7,80,112]); assert.equal(reloaded.get('player').moving,false);
  });

  check('bad JSON, invalid data and unsupported saves never partially restore', async api => {
    api.game.persistence.save(); const valid=api.sandbox.localStorage.getItem(saveKey);
    for(const mutate of [s=>{s.version=999;},s=>{s.data.farm.coins=-1;},s=>{s.data.player.c=999;},s=>{s.data.plots={'1,7':{tilled:true,crop:'bogus',growth:0,watered:false}};}]) {
      const save=JSON.parse(valid); save.data.farm.day=30; mutate(save);
      const reloaded=await loadGame({...options,storage:new Map([[saveKey,JSON.stringify(save)]])});
      assert.equal(reloaded.get('state').day,1); assert.equal(reloaded.get('state').coins,120);
      assert.equal(reloaded.game.persistence.status,'無法讀取存檔');
    }
    const invalid=await loadGame({...options,storage:new Map([[saveKey,'{not json']])});
    assert.equal(invalid.get('state').day,1);
  });

  check('blocked browser storage reports failure while the game remains playable', api => {
    api.sandbox.localStorage.setItem=()=>{throw new Error('quota exceeded');};
    api.tick(70);
    assert.equal(api.game.persistence.status,'無法存檔');
    api.call('pressB'); api.call('pressA');
    assert.equal(api.call('plotAt',5,7).tilled,true);
  });
}
