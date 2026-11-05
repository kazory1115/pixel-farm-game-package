import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGame} from './runtime.mjs';

export function registerExplorationTests(format,options){
  const check=(name,fn)=>test(`${format}: exploration: ${name}`,async()=>fn(await loadGame(options)));
  check('expanded farm connects to the market and map shows the current region',api=>{
    const {config}=api.sandbox.PixelFarm;
    assert.equal(config.COLS,28); assert.equal(config.ROWS,18);
    assert.equal(api.game.world.isSolid(26,5),false);
    api.call('pressB');
    Object.assign(api.get('player'),{tx:26,ty:5,px:416,py:80,dir:'right',moving:false});
    api.emit('window','keydown',{key:'ArrowRight'}); api.tick(); api.emit('window','keyup',{key:'ArrowRight'}); api.tick(25);
    assert.equal(api.get('scene'),'market'); assert.equal(api.get('player').tx,1);
    assert.equal(api.get('dlg').active,true,'first arrival gives the introduction once');
    api.key('m'); assert.equal(api.get('menu').tab,5); api.render();
    assert.ok(api.calls.some(c=>c[1]==='fillText' && c[2].includes('白：你')));
    api.key('m'); assert.equal(api.get('menu').open,false);
    api.get('player').dir='left';
    api.emit('window','keydown',{key:'ArrowLeft'}); api.tick(); api.emit('window','keyup',{key:'ArrowLeft'}); api.tick(25);
    assert.equal(api.get('scene'),'farm'); assert.equal(api.get('player').tx,26);
    api.game.regions.enterMarket(); assert.equal(api.get('dlg').active,false,'return visits are quiet');
  });
  check('clock advances outdoors and indoors, pauses in menus, dialogue and hidden tabs',api=>{
    api.call('pressB'); const initial=api.game.store.journey.minute;
    api.tick(60); assert.ok(api.game.store.journey.minute>initial);
    for(const mode of ['dialogue','menu','market','hidden']){
      api.get('dlg').active=mode==='dialogue'; api.get('menu').open=mode==='menu'; api.get('market').open=mode==='market';
      api.sandbox.document.visibilityState=mode==='hidden'?'hidden':'visible';
      const before=api.game.store.journey.minute; api.tick(30);
      assert.equal(api.game.store.journey.minute,before,mode);
    }
    api.sandbox.document.visibilityState='visible'; api.get('market').open=false;
    api.call('enterShop'); api.call('pressB'); const before=api.game.store.journey.minute; api.tick(30);
    assert.ok(api.game.store.journey.minute>before);
    api.game.store.journey.minute=1020; const day=api.game.clock.tint();
    api.game.store.journey.minute=1200; assert.ok(api.game.clock.tint().alpha>day.alpha);
    api.game.clock.update(10000); assert.equal(api.game.store.journey.minute,1320);
    api.game.regions.enterMarket(); api.call('sleep'); api.timers(1500);
    assert.equal(api.game.store.journey.minute,360); assert.equal(api.get('scene'),'farm');
  });
  check('trading opens at eight, closes at eighteen, and cannot sell through an already open panel',api=>{
    const j=api.game.store.journey,f=api.get('state');
    for(const [minute,open] of [[479.9,false],[480,true],[1079.9,true],[1080,false]]){
      j.minute=minute; api.get('market').open=false; api.game.commerce.openMarket();
      assert.equal(api.get('market').open,open);
    }
    f.produce.wheat=1; api.get('market').idx=0; api.get('market').open=true;
    const coins=f.coins; api.call('marketActivate');
    assert.equal(f.coins,coins); assert.equal(f.produce.wheat,1);
    api.game.regions.enterMarket(); j.minute=360; api.call('pressB'); api.call('interact',18,12);
    assert.equal(j.minute,480); api.call('interact',6,5); assert.equal(api.get('market').open,true);
    api.call('marketActivate'); assert.equal(f.produce.wheat,0); assert.ok(f.coins>coins);
  });
  check('NPC quests, social stamps and daily foraging grant each reward exactly once',api=>{
    const f=api.get('state'),j=api.game.store.journey;
    for(const npc of api.sandbox.PixelFarm.config.NPCS){
      api.game.regions.travel(npc.scene,npc.c,npc.r+1,'up');
      api.call('interact',npc.c,npc.r); assert.equal(j.talked[npc.id],true);
      if(!npc.crop) continue;
      assert.equal(j.quests[npc.id],'accepted');
      const coins=f.coins; api.call('interact',npc.c,npc.r); assert.equal(f.coins,coins);
      f.produce[npc.crop]=npc.count;
      const seeds=f.seeds[npc.seed]; api.call('interact',npc.c,npc.r);
      assert.equal(j.quests[npc.id],'done'); assert.equal(f.produce[npc.crop],0);
      assert.equal(f.coins,coins+npc.reward); assert.equal(f.seeds[npc.seed],seeds+2);
      api.call('interact',npc.c,npc.r); assert.equal(f.coins,coins+npc.reward);
    }
    const fertilizer=f.fertilizer; api.call('interact',10,10); api.call('interact',10,10);
    assert.equal(f.fertilizer,fertilizer+3);
    const wheat=f.seeds.wheat; api.call('interact',20,12); api.call('interact',20,12);
    assert.equal(f.seeds.wheat,wheat+2); f.day++; api.call('interact',20,12);
    assert.equal(j.forageDay,f.day);
  });
  check('region, time and journal resume, and older saves default safely',async api=>{
    api.game.regions.travel('market',8,9,'up');
    api.game.store.journey.minute=1170;
    api.call('interact',8,8); api.call('interact',20,12); api.game.persistence.save();
    const saved=api.sandbox.localStorage.getItem('pixelFarm.save.v1');
    const restored=await loadGame({...options,storage:new Map([['pixelFarm.save.v1',saved]])});
    assert.equal(restored.get('scene'),'market'); assert.equal(restored.game.store.journey.minute,1170);
    assert.equal(restored.game.store.journey.quests.cook,'accepted');
    assert.equal(restored.game.store.journey.forageDay,1);
    const old=JSON.parse(saved); delete old.data.journey; old.data.scene='farm'; old.data.player={c:5,r:6,dir:'down'};
    const legacy=await loadGame({...options,storage:new Map([['pixelFarm.save.v1',JSON.stringify(old)]])});
    assert.match(legacy.get('dlg').text,/歡迎回來/); assert.equal(legacy.game.store.journey.minute,480);
    const broken=JSON.parse(saved); broken.data.journey.minute=-5;
    const rejected=await loadGame({...options,storage:new Map([['pixelFarm.save.v1',JSON.stringify(broken)]])});
    assert.equal(rejected.get('scene'),'farm'); assert.equal(rejected.game.store.journey.minute,480);
  });
  check('routine farming never opens a blocking dialogue and repeated shop entries stay quiet',api=>{
    api.call('pressB');
    for(const [tool,crop] of [['hoe'],['seed','wheat'],['can']]){
      api.call('applyToolOpt',{tool,crop}); api.call('interact',2,8);
      assert.equal(api.get('dlg').active,false,tool);
      assert.ok(!api.game.store.notice,tool+' success uses sound and the crop itself');
    }
    api.call('interact',2,8); assert.equal(api.get('dlg').active,false); assert.match(api.game.store.notice.text,/已經澆過/);
    api.advanceTime(1700); api.render();
    assert.ok(!api.calls.some(c=>c[1]==='fillText' && c[2].includes('已經澆過')));
    api.call('enterShop'); api.call('pressB'); api.call('exitShop'); api.call('enterShop');
    assert.equal(api.get('dlg').active,false);
  });
}
