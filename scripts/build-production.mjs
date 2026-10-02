import { build } from 'esbuild';
import { mkdir, readdir, readFile, writeFile, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Preserve original artwork and URLs. Only the deployed icon copies are resized.
// A 1024px bound still covers a 256px UI icon on a 4x display.
export async function optimizeIcons(directory) {
  let before = 0, after = 0, count = 0;
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.png')) continue;
    const filename = path.join(directory, entry.name);
    const input = await readFile(filename);
    before += input.length;
    const output = await sharp(input).rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    if (output.length < input.length) { await writeFile(filename, output); after += output.length; count++; }
    else after += input.length;
  }
  return { before, after, count };
}

export async function buildServer(outdir = 'dist') {
  const common = { bundle: true, platform: 'node', format: 'cjs', packages: 'external', minifySyntax: true, minifyWhitespace: true, sourcemap: 'external', sourcesContent: false, logLevel: 'info' };
  await mkdir(path.join(outdir, '.server'), { recursive: true });
  await build({ ...common, entryPoints: ['languageQuestCourseCatalog.ts'], outfile: path.join(outdir, '.server/language-quest-courses.cjs') });
  const result = await build({ ...common, entryPoints: ['server.ts'], outfile: path.join(outdir, 'server.cjs'), metafile: true,
    plugins: [{ name: 'lazy-curriculum', setup(build) {
      build.onResolve({ filter: /^\.\/languageQuestCourseCatalog$/ }, () => ({ path: './.server/language-quest-courses.cjs', external: true }));
    } }],
  });
  // Keep debugging artifacts available locally, outside the web/deploy directory.
  const debugDir = '.build-debug';
  await mkdir(debugDir, { recursive: true });
  for (const [source, name] of [[path.join(outdir, 'server.cjs.map'), 'server.cjs.map'], [path.join(outdir, '.server/language-quest-courses.cjs.map'), 'language-quest-courses.cjs.map']]) {
    const map = JSON.parse(await readFile(source, 'utf8'));
    // Moving the map changes its source paths; resolve them relative to its new home.
    map.sources = map.sources.map(file => path.relative(debugDir, path.resolve(path.dirname(source), file)).split(path.sep).join('/'));
    await writeFile(path.join(debugDir, name), JSON.stringify(map));
    await rm(source);
  }
  await writeFile(path.join(debugDir, 'server-metafile.json'), JSON.stringify(result.metafile));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await optimizeIcons('dist/icons/LanguageQuests_Graphics');
  console.log(`Production icons: ${(result.before / 1048576).toFixed(1)} → ${(result.after / 1048576).toFixed(1)} MiB (${result.count} optimized; originals unchanged)`);
  await buildServer();
  console.log(`Server entry: ${((await stat('dist/server.cjs')).size / 1048576).toFixed(2)} MiB; debug maps: .build-debug/`);
}
