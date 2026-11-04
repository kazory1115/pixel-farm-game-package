import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { root, entry } from '../scripts/build.mjs';

export const digest = value => createHash('sha256').update(value).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));

// Minimal deterministic browser boundary. Draw calls are recorded, not rasterized.
export async function loadGame({ legacyPath, htmlPath = path.join(root, entry), waitForStart=true, imageMode='ready', fontMode='ready', storage = new Map() } = {}) {
  const calls = [];
  const elements = new Map();
  const events = new Map();
  const timeouts = new Map();
  const imageElements = [];
  const fontRequests = [];
  const fontResolvers = [];
  const links = [];
  const canvasResizes = [];
  const frames = [];
  let randomSeed = 123456789;
  let clock = 1700000000000;
  let frameTime = 0;
  let canvasCount = 0;
  let linkCount = 0;
  let timerId = 0;

  function canvasContext(label) {
    const initial = { font:'10px sans-serif', fillStyle:'#000000', strokeStyle:'#000000', lineWidth:1, textAlign:'start', imageSmoothingEnabled:true };
    let props = { ...initial };
    let transform = { a:1, d:1, e:0, f:0 };
    let stack = [];
    return new Proxy({}, {
      get(_, key) {
        if (key === 'reset') return () => { props = { ...initial }; transform = { a:1, d:1, e:0, f:0 }; stack = []; };
        if (key in props) return props[key];
        if (key === 'getTransform') return () => ({ ...transform });
        return (...args) => {
          if (key === 'save') stack.push({ props:{ ...props }, transform:{ ...transform } });
          if (key === 'restore' && stack.length) ({ props, transform } = stack.pop());
          if (key === 'translate') { transform.e += args[0]*transform.a; transform.f += args[1]*transform.d; }
          if (key === 'scale') { transform.a *= args[0]; transform.d *= args[1]; }
          calls.push([label, key, ...args.map(arg => arg?.imageHash ? `image:${arg.imageHash}` : arg?.canvasLabel || arg)]);
        };
      },
      set(_, key, value) { props[key] = value; calls.push([label, key, value]); return true; }
    });
  }

  function addEvent(label, type, fn) {
    const key = `${label}:${type}`;
    if (!events.has(key)) events.set(key, []);
    events.get(key).push(fn);
  }

  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const context = canvasContext(id);
    let width = 720, height = 480;
    const result = {
      canvasLabel:id, style:{ setProperty(name,value) { this[name]=value; } }, clientWidth:1280, clientHeight:720,
      textContent:'', className:'', hidden:id === 'retryLoad',
      get width() { return width; }, set width(value) { width=value; context.reset(); canvasResizes.push([id,'width',value]); },
      get height() { return height; }, set height(value) { height=value; context.reset(); canvasResizes.push([id,'height',value]); },
      remove() { this.removed=true; },
      getContext: () => context,
      addEventListener: (type, fn) => addEvent(id, type, fn),
      getAttribute: name => name === 'data-dir' ? id.replace('dpad-', '') : null,
      getBoundingClientRect: () => ({ left:0, top:0, width:element('stage').clientWidth, height:element('stage').clientHeight })
    };
    elements.set(id, result);
    return result;
  }

  class Image {
    constructor() { imageElements.push(this); if (imageMode === 'no-decode') this.decode=undefined; }
    set src(value) {
      this.source = value;
      const bytes = value.startsWith('data:') ? Buffer.from(value.split(',')[1], 'base64') : fs.readFileSync(path.join(root, value));
      this.imageHash = digest(bytes);
      this.size = [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
      this.naturalWidth = this.naturalHeight = 0;
      this.complete = false;
      if (imageMode === 'error') queueMicrotask(() => { this.complete=true; this.onerror?.(); });
      else if (imageMode !== 'deferred') this.finishLoading(false);
    }
    get src() { return this.source; }
    finishLoading(emit=true) {
      [this.naturalWidth,this.naturalHeight] = this.size;
      this.complete=true;
      if (emit) this.onload?.();
    }
    decode() {
      if (imageMode === 'decode-error') return Promise.reject(new Error('decode failed'));
      if (imageMode === 'decode-deferred') return new Promise(resolve => { this.finishDecode=resolve; });
      return Promise.resolve();
    }
  }

  const seededMath = Object.create(Math);
  seededMath.random = () => { randomSeed = (1664525*randomSeed+1013904223) >>> 0; return randomSeed/4294967296; };
  const sandbox = {
    console, Math:seededMath, Date:class extends Date { static now() { return clock; } },
    performance:{ now:() => frameTime }, Image, devicePixelRatio:1,
    addEventListener:(type, fn) => addEvent('window', type, fn),
    visualViewport:{ addEventListener:(type, fn) => addEvent('viewport', type, fn) },
    document:{
      addEventListener:(type, fn) => addEvent('document', type, fn),
      createElement:tag => element(tag === 'link' ? `font-link-${linkCount++}` : `scene-${canvasCount++}`),
      getElementById:element,
      querySelectorAll:selector => selector === '.dpad button'
        ? ['up','down','left','right'].map(dir => element(`dpad-${dir}`))
        : ['btnA','btnB','btnStart','btnSelect','nightText'].map(element),
      head:{ appendChild(link) {
        links.push(link);
        if (fontMode !== 'stylesheet-deferred') queueMicrotask(() => {
          if (fontMode === 'error') link.onerror?.();
          else link.onload?.();
        });
      } },
      fonts:fontMode === 'unavailable' ? undefined : { load:(font,text) => {
        fontRequests.push({font,text});
        return fontMode === 'font-deferred' ? new Promise(resolve => fontResolvers.push(resolve)) : Promise.resolve(fontMode === 'empty' ? [] : [{}]);
      } }
    },
    location:{ reload:() => { sandbox.reloadCount=(sandbox.reloadCount || 0)+1; } },
    setTimeout:(fn, delay) => { timeouts.set(++timerId,{fn,delay}); return timerId; },
    clearTimeout:id => timeouts.delete(id),
    requestAnimationFrame:fn => { frames.push(fn); return frames.length; }
  };
  sandbox.localStorage = {
    getItem:key => storage.has(key) ? storage.get(key) : null,
    setItem:(key,value) => storage.set(key,value)
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const html = fs.readFileSync(legacyPath || htmlPath, 'utf8');
  for (const match of html.matchAll(/<script(?:\s+src="([^"]+)"[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const filename = match[1] || 'inline.js';
    const code = match[1] ? fs.readFileSync(path.join(path.dirname(htmlPath), filename), 'utf8') : match[2];
    vm.runInContext(code, context, { filename });
  }
  const game = sandbox.PixelFarm?.game;
  const isLegacy = Boolean(legacyPath);
  const fields = {
    state:'farm', plots:'plots', player:'player', dlg:'dialogue', menu:'menu', shop:'shop', market:'market',
    scene:'scene', sleeping:'sleeping', soundOn:'soundOn', animals:'animals', eggs:'eggs', eggTimer:'eggTimer'
  };
  const modules = {
    interact:'farming', sleep:'day', say:'dialogue', updateDialog:'dialogue', checkGoals:'goals',
    updatePlayer:'player', facedTile:'player', updateAnimals:'animals', layEgg:'animals',
    toolName:'tools', currentOpt:'tools', applyToolOpt:'tools', cycleTool:'tools',
    enterShop:'commerce', exitShop:'commerce', shopInteract:'commerce', shopGoods:'commerce', shopBuy:'commerce',
    marketRows:'commerce', marketActivate:'commerce', todayPrice:'commerce', priceBoardText:'commerce',
    menuItems:'menu', menuActivate:'menu', toggleMenu:'menu', pressA:'input', pressB:'input',
    fitScreen:'surface', draw:'renderer', panelGeom:'panels', isSolid:'world', isSolidShop:'world', setSound:'audio'
  };
  const api = {
    game, sandbox, html, calls, events, imageElements, fontRequests, fontResolvers, links, canvasResizes,
    ready:game?.start(),
    pendingFrames:() => frames.length,
    pendingTimers:() => timeouts.size,
    advanceTime(milliseconds) { frameTime+=milliseconds; clock+=milliseconds; },
    get(name) { return isLegacy ? sandbox[name] : game.store[fields[name]]; },
    set(name, value) { if (isLegacy) sandbox[name]=value; else game.store[fields[name]]=value; },
    call(name, ...args) {
      if (name === 'plotAt') return isLegacy ? sandbox.plotAt(...args) : game.store.plotAt(...args);
      return isLegacy ? sandbox[name](...args) : game[modules[name]][name](...args);
    },
    emit(label, type, props = {}) {
      const event = { preventDefault(){}, repeat:false, ...props };
      for (const fn of events.get(`${label}:${type}`) || []) fn(event);
    },
    key(key, repeat=false) { api.emit('window','keydown',{ key, repeat }); api.emit('window','keyup',{ key }); },
    tick(count=1, milliseconds=16) {
      for (let i=0; i<count; i++) {
        frameTime += milliseconds; clock += milliseconds;
        const next = frames.shift();
        if (!next) throw new Error('No animation frame scheduled');
        next(frameTime);
      }
    },
    timers(delay) {
      const pending = [...timeouts].filter(([,timer]) => delay === undefined || timer.delay === delay);
      pending.forEach(([id]) => timeouts.delete(id));
      pending.forEach(([,timer]) => timer.fn());
      return pending.map(([,timer]) => timer.delay);
    },
    resize(width, height, dpr=1) {
      Object.assign(element('stage'), { clientWidth:width, clientHeight:height });
      sandbox.devicePixelRatio=dpr; api.emit('window','resize');
    },
    click(gx, gy) {
      const view = api.view();
      api.emit('game','pointerdown',{ clientX:gx/view.width*element('stage').clientWidth, clientY:gy/view.height*element('stage').clientHeight });
    },
    view() {
      return copy(isLegacy ? { width:sandbox.VW, height:sandbox.VH, worldHeight:sandbox.WORLD_H, scaleX:sandbox.SX, scaleY:sandbox.SY, camera:sandbox.cam } : game.surface.view);
    },
    render() {
      calls.length=0; api.call('draw');
      return { hash:digest(JSON.stringify(calls)), operations:calls.length, view:api.view() };
    },
    snapshot() {
      const result = copy(Object.fromEntries(Object.keys(fields).map(name => [name,api.get(name)])));
      // Pagination is new UI state, checked explicitly by interaction-fixes.mjs.
      delete result.dlg.pageStart;
      return result;
    },
    overlay() { return { text:element('nightText').textContent, className:element('nightfade').className }; }
  };
  if (waitForStart && game) await api.ready;
  return api;
}
