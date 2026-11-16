#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  console.error('用法：node scripts/version-assets.js [--check]');
  process.exit(2);
}
const check = args[0] === '--check';
const assets = ['styles.css', 'app.js', 'developer.js', 'assets/mark.svg'];
const versions = new Map(assets.map((file) => [file,
  crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').slice(0, 12)]));
let changed = false;
for (const name of ['index.html', 'install.html', 'developer.html']) {
  const file = path.join(root, name);
  const original = fs.readFileSync(file, 'utf8');
  const updated = original.replace(/(\b(?:href|src)=["'])([^"']+)(["'])/g, (match, prefix, reference, quote) => {
    const [base, fragment] = reference.split('#');
    const [asset, query = ''] = base.split('?');
    if (!versions.has(asset)) return match;
    const params = new URLSearchParams(query);
    params.set('v', versions.get(asset));
    return `${prefix}${asset}?${params}${fragment === undefined ? '' : `#${fragment}`}${quote}`;
  });
  if (updated === original) continue;
  changed = true;
  if (!check) fs.writeFileSync(file, updated);
  console.log(`${name}: ${check ? '资源版本需要更新' : '已更新资源版本'}`);
}
if (check && changed) process.exitCode = 1;
if (!changed) console.log('资源版本已是最新');
