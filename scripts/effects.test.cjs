'use strict';

// Control-flow regression tests only. These do not emulate Phaser rendering.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const source = fs.readFileSync(path.join(__dirname, '../dist/development/digimmo-tweaks.user.js'), 'utf8');

function environment(options = {}) {
  const timers = [], handlers = [], logs = [], allocated = [];
  let now = 0, allocations = 0;
  const prefs = { weather: false, seasons: false, reflections: false, ...options.settings };
  const makeObject = (type) => {
    if (++allocations === options.failAllocation) throw new Error('Injected allocation failure');
    const object = { type, destroyed: false, scene: null, texture: { width: 4, height: 4 } };
    const proxy = new Proxy(object, { get(target, key) {
      if (key === 'destroy') return () => { target.destroyed = true; };
      if (key in target) return target[key];
      return () => {
        if (options.failSetup && key === 'setOrigin') throw new Error('Injected setup failure');
        return proxy;
      };
    } });
    allocated.push(object);
    return proxy;
  };
  const scene = {
    mapId: 'mock', worldDrawn: true, ownId: 'player',
    sys: { settings: { active: true } },
    tilemap: { widthInPixels: 128, heightInPixels: 128, layers: [], tilesets: [] },
    children: { list: [], remove() {} },
    textures: { exists() { return true; } },
    cameras: { main: { zoom: 1, width: 128, height: 128, scrollX: 0, scrollY: 0 } },
    views: new Map([['player', { sprite: { x: 64, y: 64 } }]]),
    events: new EventEmitter(),
    add: { renderTexture: () => makeObject('RenderTexture'), particles: () => makeObject('Particles'), image: () => makeObject('Image') },
    make: { graphics: () => {const object=makeObject('Graphics');object.scene=scene;return object;} },
  };
  if (options.failSubscription) {
    const subscribe = scene.events.on.bind(scene.events);
    scene.events.on = (name, fn) => {
      if (name === 'shutdown') throw new Error('Injected event subscription failure');
      return subscribe(name, fn);
    };
  }
  for (const key of Object.keys(scene.add)) {
    const create = scene.add[key];
    scene.add[key] = (...args) => { const obj = create(...args); obj.scene = scene; return obj; };
  }
  const window = {
    dmo: { game: { scene: { getScene: () => scene } }, store: { getState: () => ({ world: options.world || { mapId: 'mock' } }) } },
    addEventListener: (type, fn) => handlers.push({ type, fn }),
  };
  const storage = options.storage || new Map(options.fresh ? [] : [['digimmo.client.settings.v1', JSON.stringify(prefs)]]);
  const context = vm.createContext({
    window, document: { readyState: 'loading', body: null, addEventListener: (type, fn) => handlers.push({ type, fn }) },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    navigator: { language: 'en' }, performance: { now: () => now },
    console: { info: (...args) => logs.push(args), warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    requestAnimationFrame: fn => timers.push({kind:'frame',fn}),
    setInterval: (fn, delay) => { timers.push({ fn, delay, kind: 'interval' }); return timers.length; },
    setTimeout: (fn, delay) => { timers.push({ fn, delay, kind: 'timeout' }); return timers.length; },
    clearInterval() {}, clearTimeout() {}, queueMicrotask() {},
  });
  vm.runInContext(options.code || source, context);
  return {
    context, window, scene, timers, handlers, allocated, logs, storage,
    build() {
      const tick = timers.find(t => t.kind === 'frame').fn;
      tick(); now = 300; tick();
    },
    toggleAtmosphere() {
      const event = { code: 'F10', altKey: true, preventDefault() {}, stopImmediatePropagation() {} };
      handlers.filter(h => h.type === 'keydown').forEach(h => h.fn(event));
    },
  };
}

test('Same and different versions add no duplicate timers or handlers', () => {
  const env = environment();
  const timerCount = env.timers.length, listenerCount = env.handlers.length;
  vm.runInContext(source, env.context);
  vm.runInContext(source.replace(/const VERSION = '[^']+';/, "const VERSION = 'audit-other';"), env.context);
  assert.equal(env.timers.length, timerCount);
  assert.equal(env.handlers.length, listenerCount);
  assert.equal(env.window.__digimmoTweaks.status, 'ready');
});

test('Ready worlds build on the first frame; loading and mismatched maps allocate nothing', () => {
  const world = {mapId:'mock',loading:true}, env = environment({world});
  const frame = () => env.timers.find(t=>t.kind==='frame').fn();
  frame(); assert.equal(env.allocated.length,0);
  world.loading=false; world.mapId='next'; frame(); assert.equal(env.allocated.length,0);
  world.mapId='mock'; env.scene.worldDrawn=false; frame(); assert.equal(env.allocated.length,0);
  env.scene.worldDrawn=true; const sprite=env.scene.views.get('player').sprite;
  env.scene.views.clear(); frame(); assert.equal(env.allocated.length,0);
  env.scene.views.set('player',{sprite}); frame(); assert(env.allocated.length>0);
  assert.equal(env.scene.events.listenerCount('postupdate'),1);
  const count=env.allocated.length; frame(); assert.equal(env.allocated.length,count);
  world.loading=true; frame(); assert(env.allocated.every(o=>o.destroyed));
});

test('Moonlight default migrates to 0.05 and different explicit strengths survive', () => {
  for (const [old,expected] of [[undefined,0.05],[0.12,0.05],[0.19,0.19],[0,0]]) {
    const env=environment({settings:{moonShadowAlpha:old}});
    assert.equal(env.window.__digimmoTweaks.settings.moonShadowAlpha,expected);
  }
  const fresh=environment({fresh:true});
  fresh.storage.set('digimmo.client.settings.v1',JSON.stringify({moonShadowAlpha:0.12}));
  assert.equal(environment({storage:fresh.storage}).window.__digimmoTweaks.settings.moonShadowAlpha,0.12);
});

test('Cloud baseline applies once; night light migrates only its old default', () => {
  for(const [old,expected] of [[undefined,1.05],[0.55,1.05],[0.3,0.3],[0,0],[2,2]]) {
    const env=environment({settings:{cloudDensity:0.3,clouds:false,cloudShadows:false,playerLight:old}});
    const settings=env.window.__digimmoTweaks.settings;
    assert.equal(settings.cloudDensity,2);
    assert.equal(settings.clouds,false);
    assert.equal(settings.cloudShadows,false);
    assert.equal(settings.playerLight,expected);
    assert.equal(env.storage.get('digimmo.client.migrated02'),'1');
    env.storage.set('digimmo.client.settings.v1',JSON.stringify({...settings,cloudDensity:0.7,playerLight:0.55}));
    const next=environment({storage:env.storage}).window.__digimmoTweaks.settings;
    assert.equal(next.cloudDensity,0.7);
    assert.equal(next.playerLight,0.55);
  }
  const fresh=environment({fresh:true});
  assert.equal(fresh.window.__digimmoTweaks.settings.cloudDensity,2);
  assert.equal(fresh.window.__digimmoTweaks.settings.playerLight,1.05);
  assert.equal(fresh.storage.get('digimmo.client.migrated02'),'1');
});

test('A failed startup remains reserved before a second injection can add effects', () => {
  const isolatedWindow = {};
  const isolated = vm.createContext({ window: isolatedWindow });
  const reservation = source.slice(0, source.indexOf('  const STORE_KEY'));
  assert.throws(() => vm.runInContext(reservation + "throw new Error('injected');\n})();", isolated), /injected/);
  assert.equal(isolatedWindow.__digimmoTweaks.status, 'initializing');
  vm.runInContext(source, isolated);
  assert.equal(isolatedWindow.__digimmoTweaks.status, 'initializing');
});

test('Failure of the second graphics allocation cleans up the first', () => {
  const env = environment({ failAllocation: 2 }); env.build();
  assert.equal(env.allocated.length, 1);
  assert.ok(env.allocated.every(o => o.destroyed));
  assert.equal(env.scene.events.listenerCount('postupdate'), 0);
  assert.deepEqual(Array.from(env.window.__digimmoTweaks.diagnostics().blockedMaps), ['mock']);
});

test('A setup failure cleans up its already allocated object', () => {
  const env = environment({ failSetup: true }); env.build();
  assert.equal(env.allocated.length, 1);
  assert.ok(env.allocated.every(o => o.destroyed));
});

test('Normal atmosphere teardown destroys allocations and removes scene listeners', () => {
  const env = environment(); env.build();
  assert.ok(env.allocated.length >= 4);
  assert.equal(env.scene.events.listenerCount('postupdate'), 1);
  env.toggleAtmosphere();
  assert.ok(env.allocated.every(o => o.destroyed));
  for (const name of ['postupdate', 'shutdown', 'destroy']) assert.equal(env.scene.events.listenerCount(name), 0);
});

test('A partially registered update handler is removed if later registration fails', () => {
  const env = environment({ failSubscription: true }); env.build();
  assert.ok(env.allocated.length >= 4);
  assert.ok(env.allocated.every(o => o.destroyed));
  for (const name of ['postupdate', 'shutdown', 'destroy']) assert.equal(env.scene.events.listenerCount(name), 0);
});

test('Zero wind strength keeps crowns fixed while normal strength still moves them', () => {
  const start = source.indexOf('      const swayTrees = (time) => {');
  const end = source.indexOf('\n      };', start) + '\n      };'.length;
  const crown = { L: { x: 0 }, bx: 0, by: 0, ph: 0 };
  const SETTINGS = { wind: true }, SWAY = { speed: 1.7, gustLength: 260, gustSpeed: 0.55, strong: 0 };
  const sway = vm.runInNewContext(source.slice(start, end) + '\nswayTrees;', { trees: [crown], SETTINGS, SWAY, wdx: 7 / Math.hypot(7, 3), wdy: 3 / Math.hypot(7, 3) });
  for (let t = 0; t <= 30000; t += 83) { sway(t); assert.equal(Math.abs(crown.L.x), 0); }
  SWAY.strong = 2;
  let moved = false;
  for (let t = 0; t <= 30000; t += 83) { sway(t); if (crown.L.x !== 0) moved = true; }
  assert.ok(moved);
});
