#!/usr/bin/env node
// One command to add a country: downloads real companies from OpenStreetMap, then loads them into your live site.
//   npm run add -- NG "Nigeria"
//   npm run add -- US "United States" --region "Texas"
// Extras: --all (include companies without a website)   --dry (check only, load nothing)   --local (test database)
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const own = new Set(['--dry', '--local', '--all']);
const osmArgs = argv.filter((a) => !own.has(a));
if (!osmArgs[0] || !osmArgs[1]) {
  console.log('Usage: npm run add -- <2-letter country code> "<Country name>"\nExample: npm run add -- NG "Nigeria"');
  process.exit(1);
}
const OUT = 'data/download.csv';
const run = (args) => spawnSync('node', args, { stdio: 'inherit', shell: false }).status === 0;

if (!run(['scripts/osm.mjs', ...osmArgs, ...(argv.includes('--all') ? [] : ['--require-website']), '--out', OUT])) process.exit(1);
const importArgs = ['scripts/import.mjs', OUT, ...(argv.includes('--dry') ? ['--dry'] : []), ...(argv.includes('--local') ? ['--local'] : [])];
if (!run(importArgs)) process.exit(1);
console.log('\nAll done. New pages appear on your site within about an hour.');
