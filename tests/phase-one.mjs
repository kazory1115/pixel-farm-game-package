import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './runtime.mjs';

export function registerPhaseOneTests(format, options){
  const check=(name,fn)=>test(`${format}: phase one: ${name}`,async()=>fn(await loadGame(options)));

  for (const imageMode of ['transient-error','transient-decode-error']){
    test(`${format}: phase one: automatically recovers from tile_water ${imageMode}`,async()=>{
      const api=await loadGame({...options,imageMode});
      assert.equal(await api.ready,true);
      assert.equal(api.imageElements.length,56);
      assert.equal(api.sandbox.document.getElementById('loadProgress').value,55);
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

  check('bundle deliveries consume one crop, persist, and require both collection and earnings',async api=>{
    const farm=api.get('state');
    farm.coins=10000;
    assert.equal(api.game.goals.claimBundle(),false,'money alone cannot complete the bundle');
    assert.equal(api.game.goals.donate('wheat'),false);
    farm.produce.wheat=2;
    api.get('menu').open=true; api.get('menu').tab=2; api.get('menu').idx=1;
    api.call('menuActivate');
    assert.equal(farm.produce.wheat,1);
    assert.equal(api.game.goals.donate('wheat'),false,'one donation per crop');
    let saved=api.sandbox.localStorage.getItem('pixelFarm.save.v1');
    const resumed=await loadGame({...options,storage:new Map([['pixelFarm.save.v1',saved]])});
    assert.equal(resumed.get('state').goalsDone.bundle_wheat,true);
    assert.equal(resumed.get('state').produce.wheat,1);
    for(const id of ['carrot','cabbage']){
      farm.produce[id]=1; assert.equal(api.game.goals.donate(id),true); assert.equal(farm.produce[id],0);
    }
    farm.totalEarned=299; assert.equal(api.game.goals.claimBundle(),false);
    farm.totalEarned=300;
    api.get('menu').idx=5; api.call('menuActivate');
    assert.equal(farm.sprinkler,true); assert.equal(farm.seeds.tomato,3);
    assert.equal(farm.goalsDone.bundleReward,true);
    assert.equal(api.get('menu').open,false);
    assert.equal(api.game.goals.claimBundle(),false);
    assert.equal(farm.seeds.tomato,3);
    saved=api.sandbox.localStorage.getItem('pixelFarm.save.v1');
    const claimed=await loadGame({...options,storage:new Map([['pixelFarm.save.v1',saved]])});
    assert.equal(claimed.game.goals.claimBundle(),false);
    assert.equal(claimed.get('state').sprinkler,true);
    assert.equal(claimed.get('state').seeds.tomato,3);
  });
}
