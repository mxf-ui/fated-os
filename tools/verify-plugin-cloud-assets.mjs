import { readFileSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2] || process.cwd());
const cloud = readFileSync(path.join(root, 'js/main/core/08-cloud-sync.js'), 'utf8');
const shell = readFileSync(path.join(root, 'js/main/01-system-shell.js'), 'utf8');
const persistence = readFileSync(path.join(root, 'js/main/core/05-persistence.js'), 'utf8');
function assert(ok, msg){ if(!ok) throw new Error(msg); }
assert(/function cloudClonePlain/.test(cloud), 'cloud snapshots need a deep clone helper');
assert(/widgetCustom:cloudClonePlain\(widgetCustom, \{\}\)/.test(cloud), 'plugin widget images must be cloned before cloud asset externalization');
assert(/stickers:cloudClonePlain\(stickers, \[\]\)/.test(cloud), 'sticker assets must be cloned before cloud asset externalization');
assert(/cloudExternalizeSnapshotAssets\(snapshot\)/.test(cloud), 'cloud upload must externalize data-url assets');
assert(/function remountPluginsFromSavedState/.test(shell), 'plugins must remount after restore');
assert(/restoreWidgetSlotImages\(el, type\)/.test(shell), 'remounted plugins must restore slot images');
assert(/remountPluginsFromSavedState\(\)/.test(persistence), 'persistent repaint must remount plugins');
console.log('Plugin cloud asset persistence verified.');
