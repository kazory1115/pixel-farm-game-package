import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { root, entry } from './build.mjs';

const html = await readFile(path.join(root, entry), 'utf8');
const scripts = [...html.matchAll(/<script src="(src\/[^" ]+)" defer><\/script>/g)];
for (const [, filename] of scripts) {
  new vm.Script(await readFile(path.join(root, filename), 'utf8'), { filename });
}
console.log(`${scripts.length} 個 JavaScript 檔案語法檢查通過`);
