import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const entry = 'xiang-su-nong-chang-xiao-you-xi.html';

// Share the development entry's script order. There is no second module list.
export async function build(outputDirectory = path.join(root, 'dist')) {
  let html = await readFile(path.join(root, entry), 'utf8');
  const stylePath = html.match(/<link rel="stylesheet" href="(styles\/[^" ]+)"\s*\/>/)[1];
  const css = await readFile(path.join(root, stylePath), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="styles\/[^" ]+"\s*\/>/, () => `<style>\n${css}</style>`);

  const scripts = [...html.matchAll(/<script src="(src\/[^" ]+)" defer><\/script>/g)];
  for (const [tag, sourcePath] of scripts) {
    let source = await readFile(path.join(root, sourcePath), 'utf8');
    if (sourcePath === 'src/assets.js') {
      const imagePaths = [...new Set(source.match(/assets\/game\/[\w-]+\.png/g))];
      for (const imagePath of imagePaths) {
        const bytes = await readFile(path.join(root, imagePath));
        source = source.replaceAll(imagePath, `data:image/png;base64,${bytes.toString('base64')}`);
      }
    }
    // Keep one script boundary per module and escape HTML's script end token.
    html = html.replace(tag, () => `<script>\n${source.replace(/<\/script/gi, '<\\/script')}</script>`);
  }

  await mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, entry);
  await writeFile(outputPath, html);
  return outputPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`單檔已匯出：${await build()}`);
}
