import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './runtime.mjs';

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

}
