import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, root } from '../scripts/build.mjs';
import { loadGame, digest } from './runtime.mjs';
import { scenarios } from './scenarios.mjs';
import { registerInteractionTests } from './interaction-fixes.mjs';
import { registerStartupTests } from './startup.mjs';

const baseline = JSON.parse(fs.readFileSync(new URL('fixtures/legacy-baseline.json', import.meta.url)));
const directory = fs.mkdtempSync(path.join(os.tmpdir(),'pixel-farm-build-'));
const exported = await build(directory);

test.after(() => fs.rmSync(directory,{recursive:true,force:true}));

for(const [name,scenario] of Object.entries(scenarios)) {
  for(const [format,options] of [['development',{}],['standalone',{htmlPath:exported}]]) {
    test(`${format}: ${name}`, async () => {
      const result = JSON.parse(JSON.stringify(scenario(await loadGame(options))));
      if (name === 'touch buttons pointer actions and menu selection') {
        // This checkpoint used to show a remote plot interaction after a tap.
        // Scene taps now leave the preceding state completely unchanged.
        assert.deepEqual(result[2],result[1]);
        result[2]=baseline.scenarios[name][2];
      }
      if (name === 'menu tabs scroll sound and actions') {
        const settings = result[4];
        const previous = baseline.scenarios[name][4];
        assert.deepEqual(settings.items[2], { label:'按鈕大小：100%', action:'controlSize' });
        assert.deepEqual(settings.render.view, previous.render.view);
        assert.equal(settings.render.operations, previous.render.operations + 4);
        settings.items.splice(2, 1);
        settings.render = previous.render;
      }
      if (name === 'render parity across viewports scenes and overlays') {
        // The added settings row contributes one highlight and text draw.
        for (let index=6; index<result.length; index+=11) {
          const previous=baseline.scenarios[name][index];
          assert.deepEqual(result[index].view,previous.view);
          assert.ok([previous.operations, previous.operations+4].includes(result[index].operations));
          result[index]=previous;
        }
        // Only these seven legacy frames intentionally change: the indoor START
        // menu now renders. Its visible text and behavior are checked separately.
        for (let index=10; index<result.length; index+=11) {
          const previous=baseline.scenarios[name][index];
          assert.deepEqual(result[index].view,previous.view);
          assert.notEqual(result[index].hash,previous.hash);
          assert.ok(result[index].operations>previous.operations);
          result[index]=previous;
        }
      }
      assert.deepEqual(result,baseline.scenarios[name]);
    });
  }
}

registerInteractionTests('development', {});
registerInteractionTests('standalone', { htmlPath:exported });
registerStartupTests('development', {});
registerStartupTests('standalone', { htmlPath:exported });

test('game markup and image bytes are preserved around the control settings', async () => {
  const runtime=await loadGame();
  assert.ok(runtime.game,'the root entry must boot the game directly');
  assert.doesNotMatch(runtime.html,/<meta[^>]+http-equiv=["']refresh["']|<iframe\b/i);
  const body=runtime.html.match(/<body>([\s\S]*?)<script/)[1].replace(/<section class="startup"[\s\S]*?<\/section>\n\n/, '').replace('class="padbar" id="padbar"', 'class="padbar"');
  assert.equal(digest(body),baseline.markupHash);
  const css=fs.readFileSync(path.join(root,'styles/game.css'),'utf8');
  assert.match(css,/--control-unit:min\(/);
  assert.match(css,/@media \(max-width:700px\)/);
  const source=runtime.sandbox.PixelFarm.assetSources;
  assert.deepEqual(Object.fromEntries(Object.entries(source).map(([name,file])=>[name,digest(fs.readFileSync(path.join(root,file)))])),baseline.images);
});

test('standalone export has no local stylesheet script or image dependencies', () => {
  assert.equal(path.basename(exported),'index.html');
  const html=fs.readFileSync(exported,'utf8');
  assert.doesNotMatch(html,/<script\s+src=|href="styles\/|assets\/game\//);
  assert.equal((html.match(/data:image\/png;base64,/g)||[]).length,54);
});

test('only PixelFarm is global; new instances own their state; start is idempotent', async () => {
  const runtime=await loadGame();
  for(const name of ['state','player','menu','scene','IMG','interact','draw','loop']) assert.equal(runtime.sandbox[name],undefined);
  const {PixelFarm,document}=runtime.sandbox;
  const other=PixelFarm.createGame({window:runtime.sandbox,document});
  other.store.farm.coins=999;
  assert.equal(runtime.get('state').coins,120);
  const before=[...runtime.events].map(([key,list])=>[key,list.length]);
  await runtime.game.start();
  assert.deepEqual([...runtime.events].map(([key,list])=>[key,list.length]),before);
});
