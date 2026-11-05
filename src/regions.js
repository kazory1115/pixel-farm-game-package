(function(PixelFarm){
  'use strict';
  PixelFarm.createRegions=function({config,store,clock,commerce,dialogue,audio}){
    function travel(scene,c,r,dir){
      store.scene=scene;
      Object.assign(store.player,{tx:c,ty:r,px:c*config.TILE,py:r*config.TILE,dir:dir,moving:false});
      store.shop.open=store.market.open=store.menu.open=false;
      store.input.touchDir=null; store.input.keys={};
      store.dialogue.active=false; store.notice=null;
      audio.sfx.cursor();
    }
    function enterMarket(){
      travel('market',1,8,'right');
      const visited=store.journey.visited || (store.journey.visited={});
      if(!visited.market){
        visited.market=true;
        dialogue.say('河畔市集｜交易 08:00–18:00。攤位在北邊，村民在廣場，東邊河岸每天有一份小禮物。M 或 START → 地圖可看位置。');
      }
    }
    function leaveMarket(){ travel('farm',26,5,'left'); }
    function arrive(){
      if(store.scene==='farm' && store.player.tx===config.FARM_EXIT.c && store.player.ty===config.FARM_EXIT.r){ enterMarket(); return true; }
      if(store.scene==='market' && store.player.tx===0 && store.player.ty===8){ leaveMarket(); return true; }
      return false;
    }
    function npcs(){ return config.NPCS.filter(n=>n.scene===store.scene); }
    function talk(npc){
      const journal=store.journey;
      if(!npc.crop){ dialogue.say(npc.name+'：'+npc.greeting); return; }
      const name=npc.crop==='egg' ? '雞蛋' : config.CROPS[npc.crop].name;
      const status=journal.quests[npc.id];
      if(status==='done'){ dialogue.say(npc.name+'：謝謝你幫忙！下次來市集記得看看河邊，還有告示板的集章活動。'); return; }
      if(!status){ journal.quests[npc.id]='accepted'; dialogue.say(npc.name+'：'+npc.greeting+'（已接委託，備齊後再找我）'); return; }
      if(store.farm.produce[npc.crop]<npc.count){ dialogue.say(npc.name+'：還需要'+name+' '+npc.count+' 份，你有 '+store.farm.produce[npc.crop]+' 份。獎勵 '+npc.reward+' 金與'+config.CROPS[npc.seed].name+'種子。'); return; }
      store.farm.produce[npc.crop]-=npc.count; store.farm.coins+=npc.reward;
      store.farm.seeds[npc.seed]+=2; journal.quests[npc.id]='done';
      audio.sfx.goal(); dialogue.say(npc.name+'：太好了！這是 '+npc.reward+' 金和 2 包'+config.CROPS[npc.seed].name+'種子，謝謝你的幫忙。');
    }
    function interact(c,r){
      const npc=npcs().find(n=>n.c===c && n.r===r);
      if(npc){ store.journey.talked[npc.id]=true; talk(npc); return true; }
      if(store.scene!=='market') return false;
      if(c===0 && r===8){ leaveMarket(); return true; }
      if(r===12 && (c===18 || c===19)){
        if(store.journey.minute<480){ store.journey.minute=480; dialogue.say('在河畔長椅休息到 08:00。攤位開市了，去看看今天的行情吧！'); }
        else dialogue.say('坐在長椅上聽河水流過，真舒服。每天早上也能在這裡休息到 08:00 開市。');
        return true;
      }
      if(config.TOWN.stalls.some(s=>s.c===c && s.r===r)){ commerce.openMarket(); return true; }
      if(c===config.TOWN.board.c && r===config.TOWN.board.r){
        const met=config.NPCS.filter(n=>store.journey.talked[n.id]).length;
        if(met===4 && !store.journey.talked.stampReward){
          store.journey.talked.stampReward=true; store.farm.fertilizer+=3; audio.sfx.goal();
          dialogue.say('村民集章 4/4！領到 3 包肥料。委託和河岸拾趣都可以在 START → 目標追蹤。');
        } else dialogue.say('村民集章 '+met+'/4：和園丁阿禾、阿梅、林叔、小滿各聊一次，回告示板領 3 包肥料。市集營業 08:00–18:00，現在'+clock.label()+'。');
        return true;
      }
      if(c===20 && r===12){
        if(store.journey.forageDay===store.farm.day) dialogue.say('今天已經找過河岸了，明天再來看看吧。');
        else {
          store.journey.forageDay=store.farm.day;
          const id=config.CROP_IDS[(store.farm.day-1)%config.CROP_IDS.length];
          store.farm.seeds[id]+=2; audio.sfx.egg();
          dialogue.say('在河岸撿到漂流的小種子袋！獲得 2 包'+config.CROPS[id].name+'種子，明天還可以再來。');
        }
        return true;
      }
      dialogue.say('這裡是河畔市集。北邊攤位能交易，廣場村民可接委託；西邊石板路回農場。');
      return true;
    }
    function journalRows(){
      return config.NPCS.filter(n=>n.crop).map(n=>({label:n.name+'的委託',
        meta:store.journey.quests[n.id]==='done' ? '已完成' : store.journey.quests[n.id]==='accepted' ? (n.crop==='egg'?'雞蛋':config.CROPS[n.crop].name)+'×'+n.count : '找他聊聊',info:true}))
        .concat([{label:'村民集章',meta:config.NPCS.filter(n=>store.journey.talked[n.id]).length+'/4',info:true},
        {label:'河岸拾趣',meta:store.journey.forageDay===store.farm.day?'今天已找過':'每天一份種子',info:true}]);
    }
    return {travel,enterMarket,leaveMarket,arrive,interact,npcs,journalRows};
  };
})(window.PixelFarm);
