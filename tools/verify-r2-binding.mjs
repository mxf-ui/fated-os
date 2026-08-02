import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const wrangler = readFileSync('wrangler.toml', 'utf8');
const assets = readFileSync('functions/api/assets.js', 'utf8');
assert(/\[\[r2_buckets\]\]/.test(wrangler), 'wrangler must declare r2_buckets');
assert(/binding\s*=\s*"ASSET_BUCKET"/.test(wrangler), 'R2 binding must be ASSET_BUCKET');
assert(/bucket_name\s*=\s*"fated-os-assets"/.test(wrangler), 'R2 bucket name must be fated-os-assets');
assert(/env\.ASSET_BUCKET/.test(assets), 'assets API must read ASSET_BUCKET binding');
console.log('R2 wrangler binding verified.');
