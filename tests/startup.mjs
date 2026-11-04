import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './runtime.mjs';

async function flush() {
  for (let i=0;i<15;i++) await Promise.resolve();
}

function displayFonts(api) {
  return api.calls.filter(call => call[0] === 'game' && call[1] === 'font').map(call => call[2]);
}

export function registerStartupTests(format, options) {
  const check = (name, settings, fn) => test(`${format}: startup ${name}`, async () => {
    const api = await loadGame({ ...options, ...settings });
    await fn(api);
  });

  check('waits for every image before binding controls or scheduling play', { waitForStart:false, imageMode:'deferred' }, async api => {
    assert.equal(api.imageElements.length,54);
    assert.equal(api.pendingFrames(),0);
    assert.equal(api.game.start(),api.ready);
    api.emit('btnA','click'); api.key('Enter'); api.emit('dpad-down','pointerdown');
    assert.equal(api.get('menu').open,false);
    assert.equal(api.get('player').moving,false);
    assert.equal(api.get('dlg').active,false);
    for (const image of api.imageElements.slice(0,-1)) image.finishLoading();
    await flush();
    assert.equal(api.pendingFrames(),0);
    assert.equal(api.sandbox.document.getElementById('loadProgress').value,53);
    api.imageElements.at(-1).finishLoading();
    assert.equal(await api.ready,true);
    assert.equal(api.pendingFrames(),1);
    assert.equal(api.sandbox.document.getElementById('startup').hidden,false);
    api.tick();
    assert.equal(api.game.startup.phase,'ready');
    assert.equal(api.sandbox.document.getElementById('startup').hidden,true);
    assert.equal(api.pendingTimers(),0);
  });

  check('waits for decode even when complete is already true', { waitForStart:false, imageMode:'decode-deferred' }, async api => {
    await flush();
    assert.ok(api.imageElements.every(image => image.complete && image.naturalWidth && image.decoding === 'async'));
    assert.equal(api.pendingFrames(),0);
    for (const image of api.imageElements.slice(0,-1)) image.finishDecode();
    await flush();
    assert.equal(api.pendingFrames(),0);
    api.imageElements.at(-1).finishDecode();
    assert.equal(await api.ready,true);
    assert.equal(api.pendingFrames(),1);
  });

  check('supports browsers without image.decode', { imageMode:'no-decode' }, async api => {
    assert.equal(await api.ready,true);
    api.tick();
    assert.equal(api.game.startup.phase,'ready');
  });

  for (const imageMode of ['error','decode-error']) {
    check(`shows a recoverable error for ${imageMode}`, { imageMode }, async api => {
      assert.equal(await api.ready,false);
      await flush();
      assert.equal(api.pendingFrames(),0);
      assert.equal(api.game.startup.phase,'error');
      assert.equal(api.sandbox.document.getElementById('startup').hidden,false);
      assert.equal(api.sandbox.document.getElementById('retryLoad').hidden,false);
      assert.match(api.sandbox.document.getElementById('loadMessage').textContent,/載入失敗/);
      api.emit('btnA','click'); api.key('Enter');
      assert.equal(api.get('menu').open,false);
      assert.equal(api.pendingTimers(),0);
      api.emit('retryLoad','click');
      assert.equal(api.sandbox.reloadCount,1);
    });
  }

  check('times out a stalled image request rather than leaving an endless loader', { waitForStart:false, imageMode:'deferred' }, async api => {
    api.timers(30000);
    assert.equal(await api.ready,false);
    await flush();
    assert.equal(api.game.startup.phase,'error');
    assert.match(api.sandbox.document.getElementById('loadMessage').textContent,/圖片載入逾時/);
    assert.equal(api.pendingFrames(),0);
    assert.equal(api.pendingTimers(),0);
  });

  check('preloads the actual first-frame Chinese glyphs', {}, async api => {
    assert.equal(api.fontRequests.length,1);
    assert.match(api.fontRequests[0].text,/歡迎來到像素農場/);
    assert.match(api.fontRequests[0].text,/商店/);
    assert.match(api.fontRequests[0].text,/0123456789/);
    assert.doesNotMatch(api.html,/<link(?=[^>]*rel="stylesheet")(?=[^>]*href="https:\/\/fonts.googleapis.com)[^>]*>/);
    api.tick();
    assert.ok(displayFonts(api).some(font => font.includes('DotGothic16')));
  });

  for (const fontMode of ['error','unavailable','empty']) {
    check(`starts with a fixed system font when the optional font is ${fontMode}`, { fontMode }, async api => {
      assert.equal(await api.ready,true);
      api.tick();
      assert.ok(displayFonts(api).length>0);
      assert.ok(displayFonts(api).every(font => !font.includes('DotGothic16')));
      assert.ok(!api.sandbox.document.getElementById('btnA').style.fontFamily.includes('DotGothic16'));
      assert.equal(api.game.startup.phase,'ready');
    });
  }

  check('a stalled font stylesheet cannot hold startup indefinitely', { waitForStart:false, fontMode:'stylesheet-deferred' }, async api => {
    await flush();
    assert.equal(api.pendingFrames(),0);
    api.timers(2500);
    assert.equal(await api.ready,true);
    api.tick();
    assert.ok(displayFonts(api).every(font => !font.includes('DotGothic16')));
    assert.equal(api.links[0].removed,true);
  });

  check('late font responses cannot restyle a running game after fallback', { waitForStart:false, fontMode:'font-deferred' }, async api => {
    await flush();
    assert.equal(api.fontResolvers.length,1);
    assert.equal(api.pendingFrames(),0);
    api.timers(2500);
    assert.equal(await api.ready,true);
    api.tick();
    const family=api.sandbox.document.getElementById('btnA').style.fontFamily;
    assert.ok(!family.includes('DotGothic16'));
    api.fontResolvers[0]([{}]);
    await flush();
    api.calls.length=0; api.tick();
    assert.ok(displayFonts(api).every(font => !font.includes('DotGothic16')));
    assert.equal(api.sandbox.document.getElementById('btnA').style.fontFamily,family);
  });

  check('repeated resize notifications do not reallocate unchanged canvases', {}, async api => {
    const before=api.canvasResizes.length;
    api.resize(1280,720,1); api.resize(1280,720,1);
    assert.equal(api.canvasResizes.length,before);
    api.resize(1280,720,2);
    assert.equal(api.canvasResizes.length,before+2);
    api.resize(1280,720,2);
    assert.equal(api.canvasResizes.length,before+2);
  });

  check('time spent loading is excluded from the first game update', { waitForStart:false, imageMode:'deferred' }, async api => {
    api.advanceTime(60000);
    api.imageElements.forEach(image => image.finishLoading());
    assert.equal(await api.ready,true);
    api.tick();
    assert.equal(api.get('dlg').shown,0);
    assert.equal(api.get('state').day,1);
    assert.equal(api.get('player').moving,false);
  });
}
