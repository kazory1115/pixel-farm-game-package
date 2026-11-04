const clearDialogue = api => api.call('pressB');
const plot = (api, c, r) => api.call('plotAt', c, r);
const interact = (api, c, r) => { clearDialogue(api); api.call('interact', c, r); };
const tool = (api, name, crop) => api.call('applyToolOpt', { tool:name, crop });

export const scenarios = {
  'initial state and dialogue controls'(api) {
    const checkpoints = [api.snapshot()];
    api.tick(10);
    checkpoints.push(api.snapshot());
    api.call('pressA');
    checkpoints.push(api.snapshot());
    api.call('pressA');
    api.key('Shift');
    checkpoints.push(api.snapshot());
    api.key('4');
    api.key('Shift', true);
    checkpoints.push(api.snapshot());
    return checkpoints;
  },

  'all crop lifecycles and maturity'(api) {
    const checkpoints = [];
    api.get('state').seeds = { wheat:3, carrot:3, cabbage:3, tomato:3, pumpkin:3 };
    for (const [index, id] of ['wheat','carrot','cabbage','tomato','pumpkin'].entries()) {
      const c=index+1, r=7;
      tool(api,'seed',id); interact(api,c,r); // Untilled soil rejects seeds.
      checkpoints.push(api.snapshot());
      tool(api,'hoe'); interact(api,c,r);
      tool(api,'seed',id); interact(api,c,r);
      interact(api,c,r); // Occupied tile rejects seeds.
      tool(api,'can'); interact(api,c,r); interact(api,c,r);
      tool(api,'basket'); interact(api,c,r);
      checkpoints.push(api.snapshot());
      const days = { wheat:2, carrot:3, cabbage:3, tomato:4, pumpkin:5 }[id];
      for (let day=0; day<days; day++) {
        plot(api,c,r).watered=true;
        api.call('sleep'); api.timers();
      }
      tool(api,'hoe'); interact(api,c,r); // Ripe crops harvest with every tool.
      checkpoints.push(api.snapshot());
    }
    return checkpoints;
  },

  'crop errors fertilizer sprinkler and clearing'(api) {
    const checkpoints = [];
    tool(api,'can'); interact(api,1,7);
    tool(api,'fertilizer'); interact(api,1,7);
    tool(api,'hoe'); interact(api,1,7);
    api.get('state').seeds.wheat=0;
    tool(api,'seed','wheat'); interact(api,1,7);
    api.get('state').seeds.wheat=3;
    for (const c of [1,2]) {
      tool(api,'hoe'); interact(api,c,7);
      tool(api,'seed','wheat'); interact(api,c,7);
    }
    tool(api,'fertilizer'); interact(api,1,7);
    checkpoints.push(api.snapshot());
    api.get('state').sprinkler=true;
    tool(api,'can'); interact(api,1,7);
    checkpoints.push(api.snapshot());
    api.get('state').fertilizer=2;
    tool(api,'fertilizer'); interact(api,1,7); interact(api,1,7);
    checkpoints.push(api.snapshot());
    tool(api,'hoe'); interact(api,2,7);
    checkpoints.push(api.snapshot());
    return checkpoints;
  },

  'sleep transition rain growth and duplicate sleep'(api) {
    const checkpoints = [];
    Object.assign(plot(api,1,7), { tilled:true, crop:'wheat', growth:0, watered:true });
    Object.assign(plot(api,2,7), { tilled:true, crop:'pumpkin', growth:0, watered:false });
    for (let day=0; day<12; day++) {
      api.call('sleep'); api.call('sleep'); api.call('pressA'); api.call('toggleMenu');
      checkpoints.push({ state:api.snapshot(), overlay:api.overlay() });
      const delays=api.timers();
      checkpoints.push({ state:api.snapshot(), overlay:api.overlay(), delays });
    }
    return checkpoints;
  },

  'shop purchases keyboard navigation and scene exits'(api) {
    const checkpoints = [];
    api.call('enterShop'); clearDialogue(api);
    api.call('interact',7,3);
    api.key('z');
    api.key('ArrowDown'); api.key('z');
    api.key('ArrowUp'); api.key('z',true);
    api.get('state').coins=1000;
    api.get('shop').idx=5; api.call('pressA');
    api.key('ArrowDown'); api.call('pressA'); api.call('pressA');
    checkpoints.push(api.snapshot());
    api.get('state').coins=0;
    api.get('shop').idx=4; api.call('pressA');
    checkpoints.push(api.snapshot());
    api.call('pressB');
    const player=api.get('player');
    Object.assign(player,{ tx:7, ty:7, px:112, py:112, dir:'down', moving:false });
    api.emit('window','keydown',{key:'ArrowDown'}); api.tick();
    api.emit('window','keyup',{key:'ArrowDown'}); api.tick(25);
    checkpoints.push(api.snapshot());
    return checkpoints;
  },

  'market sales day prices and goals'(api) {
    const checkpoints = [];
    api.get('state').produce={ wheat:3,carrot:2,cabbage:1,tomato:1,pumpkin:1,egg:5 };
    interact(api,2,11);
    const prices=[];
    for(let day=1;day<=30;day++) {
      api.get('state').day=day;
      prices.push(['wheat','carrot','cabbage','tomato','pumpkin','egg'].map(id=>api.call('todayPrice',id)));
    }
    api.get('state').day=1;
    api.call('pressA'); checkpoints.push(api.snapshot());
    api.key('ArrowUp'); api.call('pressA'); checkpoints.push(api.snapshot());
    api.call('pressA'); checkpoints.push(api.snapshot());
    Object.assign(api.get('state'),{ totalHarvest:1,totalEarned:300,eggsCollected:5 });
    api.get('state').goalsDone.pumpkinPlanted=true;
    api.call('checkGoals'); checkpoints.push(api.snapshot());
    return { prices,checkpoints };
  },

  'keyboard movement collisions and facing'(api) {
    clearDialogue(api);
    const checkpoints=[];
    for(const [key,count] of [['ArrowDown',20],['a',40],['w',60],['d',40],['s',20]]) {
      // This legacy route tests stepping; turn-in-place is covered separately.
      api.get('player').dir={ArrowDown:'down',a:'left',w:'up',d:'right',s:'down'}[key];
      api.emit('window','keydown',{key}); api.tick(count);
      api.emit('window','keyup',{key}); api.tick(25);
      checkpoints.push({ state:api.snapshot(), facing:api.call('facedTile') });
    }
    const farm=[],shop=[];
    for(let r=-1;r<=14;r++) for(let c=-1;c<=20;c++) farm.push(api.call('isSolid',c,r));
    for(let r=-1;r<=9;r++) for(let c=-1;c<=15;c++) shop.push(api.call('isSolidShop',c,r));
    return { checkpoints,farm,shop };
  },

  'touch buttons pointer actions and menu selection'(api) {
    api.resize(390,844,2);
    api.emit('btnB','click');
    api.emit('dpad-down','pointerdown'); api.tick(20);
    api.emit('dpad-down','pointerup'); api.tick(25);
    const checkpoints=[api.snapshot()];
    api.emit('btnSelect','click');
    api.emit('btnStart','click');
    const G=api.call('panelGeom');
    api.click(G.X+30,G.Y+18+3*12+5);
    checkpoints.push(api.snapshot());
    api.call('pressB');
    api.call('draw');
    const view=api.view();
    api.click(2*16+8-view.camera.x,7*16+8+16-view.camera.y);
    checkpoints.push(api.snapshot());
    api.emit('btnA','click'); api.emit('btnB','click');
    api.call('enterShop'); api.call('pressB'); api.call('interact',7,3);
    const shopG=api.call('panelGeom');
    api.click(shopG.X+30,shopG.Y+23);
    checkpoints.push(api.snapshot());
    api.click(0,0);
    checkpoints.push(api.snapshot());
    return checkpoints;
  },

  'menu tabs scroll sound and actions'(api) {
    clearDialogue(api); api.key('Enter');
    const checkpoints=[];
    for(let tab=0;tab<5;tab++) {
      if(tab) api.key('ArrowRight');
      const items=api.call('menuItems');
      for(let i=0;i<items.length+1;i++) api.key('ArrowDown');
      checkpoints.push({ items,state:api.snapshot(),render:api.render() });
    }
    api.get('menu').idx=1; api.key('z');
    checkpoints.push(api.snapshot());
    api.get('menu').idx=0; api.key('z');
    api.timers(); checkpoints.push(api.snapshot());
    return checkpoints;
  },

  'animals egg laying pickup and paused world'(api) {
    clearDialogue(api);
    api.tick(1200,50);
    const checkpoints=[api.snapshot()];
    for(let i=0;i<20;i++) api.call('layEgg');
    for(const egg of [...api.get('eggs')]) interact(api,egg.c,egg.r);
    api.call('pressB');
    api.get('eggs').push({c:6,r:6});
    Object.assign(api.get('player'),{tx:5,ty:6,px:80,py:96,dir:'right',moving:false});
    api.emit('window','keydown',{key:'ArrowRight'}); api.tick();
    api.emit('window','keyup',{key:'ArrowRight'}); api.tick(25);
    checkpoints.push(api.snapshot());
    api.key('Enter'); api.tick(30); checkpoints.push(api.snapshot());
    return checkpoints;
  },

  'render parity across viewports scenes and overlays'(api) {
    const renders=[];
    for(const size of [[1280,720,1],[390,844,2],[844,390,2],[1920,1080,2],[2560,720,1],[320,1200,1],[320,320,1]]) {
      api.resize(...size);
      api.call('exitShop'); api.get('menu').open=false; api.get('market').open=false;
      api.call('say','歡迎來到像素農場！北邊有商店、南邊有市集，按 START 看說明');
      api.get('dlg').shown=api.get('dlg').text.length;
      renders.push(api.render());
      api.get('state').rainy=true; renders.push(api.render()); api.get('state').rainy=false;
      api.call('pressB'); api.call('toggleMenu');
      for(let tab=0;tab<5;tab++) { api.get('menu').tab=tab; api.get('menu').idx=tab===3?15:0; renders.push(api.render()); }
      api.get('menu').open=false;
      api.get('state').produce={ wheat:3,carrot:2,cabbage:1,tomato:1,pumpkin:1,egg:5 };
      interact(api,2,11); renders.push(api.render()); api.call('pressB');
      api.call('enterShop'); api.get('dlg').shown=api.get('dlg').text.length; renders.push(api.render());
      api.call('pressB'); api.call('interact',7,3); renders.push(api.render());
      api.call('pressB'); api.call('toggleMenu'); renders.push(api.render()); // Indoor START menu; the bug fix is checked separately.
      api.call('pressB');
    }
    return renders;
  }
};
