import { cp, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { makeWorker } from './offline.js';
import { syncDesignFiles } from './design.js';
await syncDesignFiles();
await cp(new URL('../public/',import.meta.url), new URL('../dist/',import.meta.url), {recursive:true});
await writeFile(new URL('../dist/sw.js', import.meta.url), await makeWorker(fileURLToPath(new URL('../public/', import.meta.url))));
console.log('Статическая версия подготовлена в dist');
