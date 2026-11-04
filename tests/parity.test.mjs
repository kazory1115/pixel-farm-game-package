import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, root } from '../scripts/build.mjs';
import { loadGame, digest } from './runtime.mjs';
import { scenarios } from './scenarios.mjs';
import { registerInteractionTests } from './interaction-fixes.mjs';

const baseline = JSON.parse(fs.readFileSync(new URL('fixtures/legacy-baseline.json', import.meta.url)));
const directory = fs.mkdtempSync(path.join(os.tmpdir(),'pixel-farm-build-'));
const exported = await build(directory);

test.after(() => fs.rmSync(directory,{recursive:true,force:true}));

for(const [name,scenario] of Object.entries(scenarios)) {
  for(const [format,options] of [['development',{}],['standalone',{htmlPath:exported}]]) {
    test(`${format}: ${name}`, () => {
      const result = JSON.parse(JSON.stringify(scenario(loadGame(options))));
      if (name === 'touch buttons pointer actions and menu selection') {
        // This checkpoint used to show a remote plot interaction after a tap.
        // Scene taps now leave the preceding state completely unchanged.
        assert.deepEqual(result[2],result[1]);
        result[2]=baseline.scenarios[name][2];
      }
      if (name === 'render parity across viewports scenes and overlays') {
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

test('original markup styles and image bytes are preserved', () => {
  const runtime=loadGame();
  const body=runtime.html.match(/<body>([\s\S]*?)<script/)[1];
  assert.equal(digest(body),baseline.markupHash);
  assert.equal(digest(fs.readFileSync(path.join(root,'styles/game.css'))),baseline.cssHash);
  const source=runtime.sandbox.PixelFarm.assetSources;
  assert.deepEqual(Object.fromEntries(Object.entries(source).map(([name,file])=>[name,digest(fs.readFileSync(path.join(root,file)))])),baseline.images);
});

test('standalone export has no local stylesheet script or image dependencies', () => {
  const html=fs.readFileSync(exported,'utf8');
  assert.doesNotMatch(html,/<script\s+src=|href="styles\/|assets\/game\//);
  assert.equal((html.match(/data:image\/png;base64,/g)||[]).length,54);
});

test('only PixelFarm is global; new instances own their state; start is idempotent', () => {
  const runtime=loadGame();
  for(const name of ['state','player','menu','scene','IMG','interact','draw','loop']) assert.equal(runtime.sandbox[name],undefined);
  const {PixelFarm,document}=runtime.sandbox;
  const other=PixelFarm.createGame({window:runtime.sandbox,document});
  other.store.farm.coins=999;
  assert.equal(runtime.get('state').coins,120);
  const before=[...runtime.events].map(([key,list])=>[key,list.length]);
  runtime.game.start();
  assert.deepEqual([...runtime.events].map(([key,list])=>[key,list.length]),before);
});
