import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './runtime.mjs';

export function registerPhaseOneTests(format, options){
  const check=(name,fn)=>test(`${format}: phase one: ${name}`,async()=>fn(await loadGame(options)));

  for (const imageMode of ['transient-error','transient-decode-error']){
    test(`${format}: phase one: automatically recovers from tile_water ${imageMode}`,async()=>{
      const api=await loadGame({...options,imageMode});
      assert.equal(await api.ready,true);
      assert.equal(api.imageElements.length,55);
      assert.equal(api.sandbox.document.getElementById('loadProgress').value,54);
      assert.equal(api.pendingTimers(),0);
      api.tick();
      assert.equal(api.game.startup.phase,'ready');
    });
  }

  check('shop welcome text fits measured bounds and preserves every character',api=>{
    for(const size of [[390,844],[844,390],[320,320],[1280,720]]){
      api.resize(...size); api.call('enterShop');
      const expected=api.get('dlg').text;
      let actual='';
      for(let i=0;i<10 && api.get('dlg').active;i++){
        api.call('pressA');
        const page=api.game.dialogue.currentPage();
        for(const line of page.lines) assert.ok(api.game.surface.measureText(line,9)<=api.view().width-34+.01);
        actual+=page.lines.join(''); api.call('pressA');
      }
      assert.equal(actual,expected);
      assert.ok(actual.includes('買東西'));
    }
  });

  check('body widths block approaching every livestock species from all four directions',api=>{
    api.call('pressB');
    for(const a of api.get('animals').filter(a=>a.zone!=='pond')){
      api.set('animals',[a]); Object.assign(a,{x:264,y:88,tx:264,ty:88});
      for(const [c,r] of [[15,5],[17,5],[16,4],[16,6]]){
        Object.assign(api.get('player'),{tx:c,ty:r,px:c*16,py:r*16,moving:false});
        assert.equal(api.game.world.animalBlocksStep(16,5),true,a.kind);
      }
      Object.assign(api.get('player'),{tx:15,ty:5,px:240,py:80});
      const offset=api.game.world.animalWidth(a)+3.5;
      Object.assign(a,{x:248+offset,y:88});
      assert.equal(api.game.world.animalBlocksStep(16,5),true,a.kind+' outer body must block');
    }
  });

  check('animals never stack during extended roaming and loaded overlaps are repaired',async api=>{
    api.call('pressB');
    for(let i=0;i<2400;i++){
      api.call('updateAnimals',.05);
      const animals=api.get('animals');
      for(let j=0;j<animals.length;j++) for(let k=j+1;k<animals.length;k++){
        if(animals[j].zone===animals[k].zone) assert.equal(api.game.world.animalsOverlap(animals[j],animals[j].x,animals[j].y,animals[k]),false);
      }
    }
    assert.equal(api.game.persistence.save(),true);
    const saved=JSON.parse(api.sandbox.localStorage.getItem('pixelFarm.save.v1'));
    for(const a of saved.data.animals.filter(a=>a.zone==='pen')) Object.assign(a,{x:264,y:88,tx:264,ty:88});
    const restored=await loadGame({...options,storage:new Map([['pixelFarm.save.v1',JSON.stringify(saved)]])});
    assert.match(restored.get('dlg').text,/歡迎回來/);
    const pen=restored.get('animals').filter(a=>a.zone==='pen');
    for(let j=0;j<pen.length;j++) for(let k=j+1;k<pen.length;k++) assert.equal(restored.game.world.animalsOverlap(pen[j],pen[j].x,pen[j].y,pen[k]),false);
  });

}
