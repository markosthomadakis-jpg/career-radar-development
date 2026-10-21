import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
await mkdir(resolve(import.meta.dirname,'../dist/server'),{recursive:true});
await import('./bundle-worker.mjs');
console.log('Built offline Private Beta Worker (no network or API calls).');
