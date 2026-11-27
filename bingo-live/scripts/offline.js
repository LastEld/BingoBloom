import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// The worker and its cache change together, including when only artwork changes.
export async function makeWorker(directory) {
  const paths = [];
  async function collect(relative) {
    for (const entry of await readdir(path.join(directory, relative), {withFileTypes: true})) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await collect(name);
      else if (entry.isFile()) paths.push(name);
    }
  }
  await collect('');
  paths.sort();
  const source = await readFile(new URL('./worker-template.js', import.meta.url), 'utf8');
  const digest = createHash('sha256').update(source);
  for (const file of paths) digest.update(file).update('\0').update(await readFile(path.join(directory, file)));
  return 'const cacheName = "bingo-bloom-shell-' + digest.digest('hex').slice(0, 20) + '";\n' +
    'const resources = ' + JSON.stringify(paths.map(name => './' + name)) + ';\n' + source;
}
