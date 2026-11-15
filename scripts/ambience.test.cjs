'use strict';

// Offline regression checks against the userscript's actual audio functions.
// These mocks verify control flow and graph ownership, not audible game output.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname, '../dist/development/digimmo-tweaks.user.js'), 'utf8');
const block = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a, `Missing source block: ${start}`);
  return source.slice(a, b);
};
const bootstrap = block('  // Audio changes requiring a restart', '  // All visual effects');
const samples = block('    const sampleCache = new WeakMap();', '    const build = (scene) =>');
const ambience = block('      const amb = { ctx: null };', '      for (const l of lights)');
const quiet = { info() {}, warn() {} };
const baseSettings = {
  audioFix: true, audioLatency: 'playback', stepGain: 0.35, stepLowpass: 2500,
  masterThreshold: -1, sfxThreshold: -6, sfxRatio: 12,
  ambientEnabled: true, ambientWind: 1, ambientBirds: 1, ambientCrickets: 1,
  ambientFire: 1, ambientWater: 1, ambientWaves: 1,
};

function mocks() {
  class Param {
    constructor(ctx, value = 0) { this.ctx = ctx; this.current = value; }
    get value() { return this.current; }
    set value(value) {
      if (this.ctx.failParam === this) { this.ctx.failParam = null; throw new Error('Parameter failure'); }
      this.current = value;
    }
    setTargetAtTime(value) { this.value = value; }
    setValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
    cancelScheduledValues() {}
  }
  class Node {
    constructor(ctx, kind) {
      this.ctx = ctx; this.kind = kind; this.edges = new Set();
      for (const key of ['gain', 'frequency', 'Q', 'pan', 'playbackRate', 'threshold', 'knee', 'ratio', 'attack', 'release'])
        this[key] = new Param(ctx, key === 'gain' ? 1 : 0);
    }
    connect(dest) {
      if (this.ctx.failConnect?.(this, dest)) { this.ctx.failConnect = null; throw new Error('Connection failure'); }
      this.edges.add(dest); return dest;
    }
    disconnect(dest) {
      if (dest === undefined) { this.edges.clear(); return; }
      if (!this.edges.delete(dest)) throw new Error('No matching connection');
    }
    start(...args) { this.started = true; this.startArgs = args; }
    stop() { this.stopped = true; }
  }
  class Context {
    constructor(opts) {
      this.opts = opts; this.currentTime = 10; this.state = 'running'; this.sampleRate = 48000;
      this.nodes = []; this.destination = this.node('destination');
    }
    node(kind) { const n = new Node(this, kind); this.nodes.push(n); return n; }
    createDynamicsCompressor() { return this.node('compressor'); }
    createGain() { return this.node('gain'); }
    createOscillator() { return this.node('oscillator'); }
    createBufferSource() { return this.node('source'); }
    createStereoPanner() { return this.node('panner'); }
    createBiquadFilter() { return this.node('filter'); }
    createBuffer(channels, length, sampleRate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: i => data[i] };
    }
  }
  return { Context };
}

function boot(settings = {}) {
  const { Context } = mocks(), intervals = new Map(), timeouts = new Map(), microtasks = [];
  let timerId = 0;
  const originalCreate = Context.prototype.createDynamicsCompressor;
  const originalCue = function (e) { return e; }, originalKill = function (v) { v.originalKill = true; };
  const audio = { ctx: null, cue: null, kill: originalKill, sfxBuffer() { return this.buffer; }, release() {} };
  const director = { cue: originalCue };
  const window = { AudioContext: Context, BaseAudioContext: Context, dmo: { audio, audioDirector: director } };
  const sandbox = {
    SETTINGS: { ...baseSettings, ...settings }, window, console: quiet,
    queueMicrotask: fn => microtasks.push(fn),
    setInterval: fn => { intervals.set(++timerId, fn); return timerId; },
    clearInterval: id => intervals.delete(id),
    setTimeout: fn => { timeouts.set(++timerId, fn); return timerId; },
    clearTimeout: id => timeouts.delete(id),
  };
  vm.runInNewContext(bootstrap + '\nglobalThis.api = { patchAudio, routeAudio, restoreAudioBootstrap };', sandbox);
  const buildGame = () => {
    const ctx = new window.AudioContext({ latencyHint: 'balanced' }); audio.ctx = ctx;
    audio.master = ctx.createGain(); const comp = ctx.createDynamicsCompressor();
    for (const [key, value] of Object.entries({ threshold: -6, knee: 6, ratio: 12, attack: 0.003, release: 0.15 })) comp[key].value = value;
    audio.master.connect(comp); comp.connect(ctx.destination);
    audio.sfxBus = ctx.createGain(); audio.sfxBus.connect(audio.master);
    audio.buffer = ctx.createBuffer(1, 512, 48000); audio.buffer.getChannelData(0).fill(1);
    return { ctx, comp };
  };
  return { ...sandbox, Context, audio, director, intervals, timeouts, originalCreate, originalCue, originalKill,
    buildGame, flush: () => { while (microtasks.length) microtasks.shift()(); },
    tick: () => { for (const fn of [...intervals.values()]) fn(); } };
}

function checkBootstrap() {
  const off = boot({ audioFix: false });
  off.buildGame(); assert.equal(off.api.patchAudio(), true);
  assert.equal(off.director.cue, off.originalCue);
  assert.equal(off.director.cue({ sfx: 'world.step', gain: 1 }).gain, 1);
  assert.equal(off.audio.kill, off.originalKill);
  assert.equal(off.window.AudioContext, off.Context);
  assert.equal(off.Context.prototype.createDynamicsCompressor, off.originalCreate);
  assert.equal(off.intervals.size, 0);

  const on = boot(), { ctx } = on.buildGame(); on.flush(); on.tick();
  assert.equal(ctx.opts.latencyHint, 'playback');
  assert.equal(on.director.cue({ sfx: 'world.step', gain: 1 }).gain, 0.35);
  assert.equal(on.director.cue({ sfx: 'other', gain: 1 }).gain, 1);
  const event = { sfx: 'world.step', gain: 0.5 }; on.director.cue(event); assert.equal(event.gain, 0.5);
  on.SETTINGS.stepGain = 0; assert.equal(on.director.cue({ sfx: 'world.step' }), undefined);
  const original = on.audio.buffer, processed = on.audio.sfxBuffer('world.step');
  assert.notEqual(processed, original); assert.equal(original.getChannelData(0)[0], 1);
  assert.equal(processed.getChannelData(0)[0], 0);
  assert.equal(on.audio.sfxBuffer('world.step'), processed);
  assert.equal(on.audio.sfxBuffer('other'), original);
  assert.equal(on.window.AudioContext, on.Context);
  assert.equal(on.Context.prototype.createDynamicsCompressor, on.originalCreate);
  assert.equal(on.intervals.size, 0); assert.equal(on.timeouts.size, 0);

  // Failure before removing the direct edge, then successful timer retry.
  const retry = boot(), first = retry.buildGame();
  const observer = first.ctx.createGain(); retry.audio.sfxBus.connect(observer);
  first.ctx.failConnect = (from, to) => from === retry.audio.sfxBus && to.kind === 'compressor';
  retry.flush(); assert.equal(retry.audio.__digimmoAudio, undefined);
  assert(retry.audio.sfxBus.edges.has(retry.audio.master));
  assert(retry.audio.sfxBus.edges.has(observer));
  retry.tick(); assert.equal(retry.audio.__digimmoAudio, true);
  assert(!retry.audio.sfxBus.edges.has(retry.audio.master));
  assert(retry.audio.sfxBus.edges.has(observer));
  assert.equal(retry.audio.sfxBus.edges.size, 2);
  assert.equal(retry.Context.prototype.createDynamicsCompressor, retry.originalCreate);

  // Failure after removing the direct edge must restore both graph and limiter.
  const rollback = boot(), second = rollback.buildGame(); second.ctx.failParam = second.comp.threshold;
  rollback.flush(); assert.equal(rollback.audio.__digimmoAudio, undefined);
  assert(rollback.audio.sfxBus.edges.has(rollback.audio.master));
  assert.equal(second.comp.threshold.value, -6);
  assert.equal(rollback.audio.sfxBus.edges.size, 1);
  rollback.tick(); assert.equal(rollback.audio.__digimmoAudio, true);
  assert.equal(second.comp.threshold.value, -1);

  // Startup hooks have a deadline even if the game never creates audio.
  const late = boot(); for (const fn of [...late.timeouts.values()]) fn();
  assert.equal(late.window.AudioContext, late.Context);
  assert.equal(late.Context.prototype.createDynamicsCompressor, late.originalCreate);
  assert.equal(late.intervals.size, 0);

  // Cleanup must not overwrite a later owner's replacement.
  const owned = boot(), replacement = function () {};
  owned.window.AudioContext = replacement;
  owned.Context.prototype.createDynamicsCompressor = replacement;
  owned.api.restoreAudioBootstrap();
  assert.equal(owned.window.AudioContext, replacement);
  assert.equal(owned.Context.prototype.createDynamicsCompressor, replacement);
}

async function checkDecoding() {
  for (const mode of ['good', 'partial', 'all', 'malformed']) {
    const sandbox = { AMB_SAMPLES: { wind: 'YQ==', birds: mode === 'malformed' ? '!' : 'Yg==' }, atob };
    vm.runInNewContext(samples + '\nglobalThis.ensure = ensureSamples;', sandbox);
    let calls = 0;
    const ctx = { decodeAudioData(bytes) {
      calls++;
      if (mode === 'all') throw new Error('Decoder unavailable');
      if (mode === 'partial' && new Uint8Array(bytes)[0] === 98) return Promise.reject(new Error('Unsupported sample'));
      return Promise.resolve({ duration: 1 });
    } };
    const entry = sandbox.ensure(ctx); assert.equal(entry.ready, false);
    assert.equal(sandbox.ensure(ctx), entry);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(entry.ready, true); assert.equal(entry.total, 2);
    assert.equal(Object.keys(entry.buffers).length, mode === 'good' ? 2 : mode === 'all' ? 0 : 1);
    assert.equal(entry.failed.length, mode === 'good' ? 0 : mode === 'all' ? 2 : 1);
    assert.equal(calls, mode === 'malformed' ? 1 : 2);
  }
  const empty = { AMB_SAMPLES: {}, atob };
  vm.runInNewContext(samples + '\nglobalThis.ensure = ensureSamples;', empty);
  assert.equal(empty.ensure({}).ready, true);
}

const allSamples = ['wind', 'birds', 'crickets', 'machine', 'waterfall', 'stream', 'sea', 'town', 'fire',
  'chirp1', 'chirp2', 'chirp3', 'wave1', 'wave2', 'wave3', 'wave4', 'gull1', 'gull2', 'lake', 'fountain'];
function soundscape(names = allSamples, options = {}) {
  const { Context } = mocks(), ctx = new Context(); ctx.sampleRate = 1000;
  const timers = [], stats = {}, SETTINGS = { ...baseSettings };
  let me = { x: 0, y: 0 };
  const sandbox = { SETTINGS, AMBIENT: { volume: 0.5 },
    window: { dmo: { audio: { ctx, master: ctx.createGain(), settings: {} } } },
    mapText: options.map || 'native_forest', weather: [], extra: [], season: 'summer',
    lights: [{ x: 0, y: 0, def: { test: /campfire/ } }], water: options.inland ? [] : Array.from({ length: 12 }, (_, i) => ({ x: i * 16 - 8, y: -8, shore: true })),
    localWater: {shore: options.inland ? [] : Array.from({length:12},(_,i)=>({x:i*16,y:0})),fountains:[],lake:[],...options.localWater}, fxLights: options.fxLights || [],
    runningWater: [{ x: -8, y: -8, fall: true }, { x: 32, y: 0, fall: false }],
    casters: [], treeGroups: [{ x: 10, y: 10 }], trees: [], objectCells: new Map(), trunkOwner: new Map(), shadowParts: [], ownedSlices: 0,
    cleanups: [], setTimeout: fn => timers.push(fn), ownPos: () => me, s: { dark: options.night ? 0.9 : 0.1 },
    smooth: (a, b, value) => Math.max(0, Math.min(1, (value - a) / (b - a))),
    ensureSamples: () => ({ buffers: Object.fromEntries(names.map(name => [name, { name, duration: name.startsWith('wave') ? 14 : 8 }])),
      total: allSamples.length, failed: allSamples.filter(name => !names.includes(name)), ready: !options.loading }),
  };
  vm.runInNewContext(ambience + '\nglobalThis.api = { amb, stats, soundProfile, ambUpdate, ambStop, sampleOnce };', sandbox);
  const update = (t = ctx.currentTime + 1) => { ctx.currentTime = t; sandbox.api.ambUpdate(t * 1000); };
  update(10);
  return { ...sandbox, ...sandbox.api, ctx, timers, update, move: (x, y) => { me = { x, y }; }, missingPlayer: () => { me = null; } };
}

function checkAmbience() {
  test('Fountains and lake fade with distance, larger fountains are louder and missing sources retain fallback', () => {
    const small={x:0,y:0,range:80,level:0.3},large={...small,range:112,level:0.4};
    const env=soundscape(allSamples,{localWater:{fountains:[small],lake:[{x:0,y:0}]}});
    const level=Number(/const WATER_LEVEL = ([\d.]+)/.exec(ambience)[1]);
    assert.equal(env.amb.sv.fountain.g.gain.value,level*0.3);assert.equal(env.amb.sv.lake.g.gain.value,level*0.28);
    const big=soundscape(allSamples,{localWater:{fountains:[large],lake:[]}});
    assert(big.amb.sv.fountain.g.gain.value>env.amb.sv.fountain.g.gain.value);
    env.move(1000,1000);env.update(100);
    assert.equal(env.amb.sv.fountain.g.gain.value,0);assert.equal(env.amb.sv.lake.g.gain.value,0);
    const missing=soundscape(allSamples.filter(n=>n!=='fountain'),{localWater:{fountains:[small],lake:[]}});
    assert(missing.amb.water.g.gain.value>0);
  });
  test('Villages have no traffic, night softens their wind and forest crickets stay sparse', () => {
    const town=soundscape(allSamples,{map:'primary_village'});
    const dayWind=town.amb.sv.wind.g.gain.value;assert.equal(town.amb.sv.town,undefined);
    town.s.dark=1;town.update(11);assert.equal(town.amb.sv.town,undefined);
    assert(town.amb.sv.wind.g.gain.value<dayWind);
    const forest=soundscape(allSamples,{night:true});forest.update(100);
    const cricket=[...forest.amb.voices].find(v=>v.location?.nighttime);
    assert.equal(cricket.baseGain,0.03);assert.equal(forest.soundProfile.crickets,0.04);
  });
  test('Cities use daytime traffic and nighttime wind with complementary transition gains', () => {
    for(const map of ['fog_city','odaiba','highton']){
      const city=soundscape(allSamples,{map,inland:true});
      assert.equal(city.amb.sv.town.g.gain.value,0.13);
      assert.equal(city.amb.sv.wind.g.gain.value,0);
      assert.equal(city.amb.wind.g.gain.value,0);
      city.s.dark=0.5;city.update(11);
      assert.equal(city.amb.sv.town.g.gain.value,0.065);
      assert(city.amb.sv.wind.g.gain.value>0 && city.amb.sv.wind.g.gain.value<=0.025);
      city.s.dark=1;city.update(12);
      assert.equal(city.amb.sv.town.g.gain.value,0);
      assert(city.amb.sv.wind.g.gain.value>=0.035 && city.amb.sv.wind.g.gain.value<=0.05);
      assert.equal(city.amb.wind.g.gain.value,0);
    }
    const missing=soundscape(allSamples.filter(n=>n!=='wind'),{map:'fog_city',inland:true});
    assert.equal(missing.amb.wind.g.gain.value,0);
    missing.s.dark=1;missing.update(11);
    assert(missing.amb.wind.g.gain.value>0);
    assert.equal(missing.amb.sv.town.g.gain.value,0);
  });
  test('Recorded paths use distinct stream, waterfall and sea beds without synthesized layers', () => {
    const good = soundscape(); good.update(100);
    assert.equal(good.stats.samples, 'recorded'); assert.equal(good.stats.sampleLoaded, 20);
    for (const key of ['wind', 'water', 'sea']) assert.equal(good.amb[key].g.gain.value, 0);
    assert(good.amb.sv.stream); assert(good.amb.sv.waterfall); assert(good.amb.sv.sea);
    assert(!good.amb.sv.birds); assert(!good.amb.sv.machine); assert(!good.amb.sv.town);
    assert.equal(good.ctx.nodes.filter(n => n.kind === 'oscillator').length, 0);
    assert.equal([...good.amb.voices].length, 3);
  });
  test('Partial failures keep only the missing source fallback and decoded event variants', () => {
    const partial = soundscape(['wind', 'waterfall', 'wave2']); partial.update(100);
    assert.equal(partial.stats.samples, 'mixed'); assert.equal(partial.amb.wind.g.gain.value, 0);
    assert(partial.amb.water.g.gain.value > 0, 'Missing stream must still have fallback');
    assert(partial.amb.sea.g.gain.value > 0, 'Single waves do not replace the quiet sea bed');
    const waves = partial.ctx.nodes.filter(n => n.kind === 'source' && /^wave\d/.test(n.buffer?.name));
    assert.equal(waves.length, 1); assert.equal(waves[0].buffer.name, 'wave2');
    const failed = soundscape([], { night: true }); failed.update(100);
    assert.equal(failed.stats.samples, 'synth'); assert.equal(failed.stats.sampleLoaded, 0);
    for (const key of ['wind', 'water', 'sea']) assert(failed.amb[key].g.gain.value > 0);
    assert(failed.ctx.nodes.some(n => n.kind === 'oscillator'));
    const loading = soundscape(['wind', 'wave1'], { loading: true }); loading.update(100);
    assert.equal(loading.stats.samples, 'loading'); assert.equal(loading.amb.sv, null);
    assert(loading.amb.wind.g.gain.value > 0);
  });
  test('Waves wait for their duration plus a pause and avoid immediate repeats', () => {
    const env = soundscape(); env.update(100);
    const first = env.amb.lastSample.wave;
    assert(env.amb.nextWave >= 119.04 && env.amb.nextWave <= 128.04);
    env.update(114); assert.equal(env.amb.lastSample.wave, first);
    env.update(130); assert.notEqual(env.amb.lastSample.wave, first);
    assert(env.amb.nextBird >= 158.24, 'Bird pause begins after the brief passage');
    assert(env.amb.nextGull >= 192.24, 'Gull pause begins after the brief passage');
  });
  test('A wave is attenuated at its start and continuously follows player distance and direction', () => {
    const env = soundscape(); env.move(0, 100); env.update(100);
    const voice = [...env.amb.voices].find(v => v.location && !v.location.daytime);
    assert(voice.g.gain.value > 0 && voice.g.gain.value < 0.42);
    const original = voice.g.gain.value;
    env.move(-50, 100); env.update(101); assert(voice.p.pan.value > 0);
    env.move(50, 100); env.update(102); assert(voice.p.pan.value < 0);
    env.move(1000, 1000); env.update(103);
    assert.equal(voice.g.gain.value, 0);
    for (const key of ['waterfall', 'stream', 'fire', 'sea']) assert.equal(env.amb.sv[key].g.gain.value, 0);
    assert(original > 0);
  });
  test('Bird and gull calls fade with night, with no daytime call started at night', () => {
    const env = soundscape(); env.update(100);
    const calls = [...env.amb.voices].filter(v => v.location?.daytime);
    assert.equal(calls.length, 2);
    env.s.dark = 1; env.update(101);
    for (const voice of calls) assert.equal(voice.g.gain.value, 0);
    assert.equal(env.amb.sv.birds, undefined, 'Birds must never run as a bed');
    assert.equal(env.amb.sv.crickets, undefined, 'Crickets must never run as a bed');
    assert([...env.amb.voices].some(v => v.location?.nighttime));
    const night = soundscape(allSamples, { night: true }); night.update(100);
    assert(!night.ctx.nodes.some(n => /^(chirp|gull)/.test(n.buffer?.name)));
  });
  test('Gulls and crickets use brief passages followed by long silent intervals', () => {
    const day = soundscape(); day.update(100);
    const gull = [...day.amb.voices].find(v => v.location?.daytime && v.end < 103);
    assert(gull); assert(Math.abs(gull.end - 102.24) < 0.001);
    assert(day.amb.nextGull >= gull.end + 90 && day.amb.nextGull <= gull.end + 180);
    const night = soundscape(allSamples, { night: true }); night.update(100);
    const cricket = [...night.amb.voices].find(v => v.location?.nighttime);
    assert(cricket); assert(Math.abs(cricket.end - 103.24) < 0.001);
    assert(night.amb.nextCricket >= cricket.end + 75 && night.amb.nextCricket <= cricket.end + 150);
    assert(!night.ctx.nodes.some(n => n.loop && n.buffer?.name === 'crickets'));
    night.s.dark = 0; night.update(101); assert.equal(cricket.g.gain.value, 0);
    const fallback = soundscape(allSamples.filter(n => n !== 'crickets'), { night: true }); fallback.update(100);
    assert(fallback.amb.nextCricket >= 175 && fallback.amb.nextCricket <= 250);
  });
  test('Regional profiles keep towns, industry, snow, deserts and dark maps distinct', () => {
    for (const [map, region] of [['primary_village', 'village'], ['gate_village', 'village'], ['toy_town', 'village'],
      ['fog_city', 'city'], ['odaiba', 'city'], ['highton_terrace', 'city'], ['factorial_town', 'industry'],
      ['kaiser_fortress', 'industry'], ['spiral_city', 'industry'], ['kaiser_canyon', 'drylands'],
      ['server_desert', 'drylands'], ['gear_savanna', 'drylands'], ['freezeland', 'highlands'],
      ['holy_peaks', 'highlands'], ['spiral_summit', 'highlands'], ['myotismon_castle', 'remote'],
      ['network', 'remote'], ['sea_of_darkness', 'remote'], ['sunset_bay', 'coast'], ['native_forest', 'woodland']]) {
      const env = soundscape(allSamples, { map });
      assert.equal(env.soundProfile.name, region, map);
      if (['remote', 'highlands', 'industry'].includes(region)) assert.equal(env.soundProfile.calls, 0);
    }
    const town = soundscape(allSamples, { map: 'odaiba' }); assert(town.amb.sv.town); assert(!town.amb.sv.machine);
    const desert = soundscape(allSamples, { map: 'server_desert' }); assert(!desert.amb.sv.machine);
    const inland = soundscape(allSamples, { map: 'destiny_lake', inland: true }); inland.update(100);
    assert.equal(inland.stats.waveGain, 0); assert(!inland.amb.sv.sea);
    assert(!inland.ctx.nodes.some(n => /^(wave\d|gull)/.test(n.buffer?.name)));
  });
  test('End events release every transient node and keep the registry bounded', () => {
    const env = soundscape(); env.update(100);
    const voices = [...env.amb.voices];
    const sources = env.ctx.nodes.filter(n => n.onended);
    assert.equal(sources.length, 3);
    for (const src of sources) { const end = src.onended; end(); end(); assert.equal(src.edges.size, 0); }
    assert.equal(env.amb.voices.size, 0);
    assert(voices.every(v => v.g.edges.size === 0 && v.p.edges.size === 0));
  });
  test('Map teardown and rapid restart stop the old generation without disposing the new one', () => {
    const env = soundscape(); env.update(100);
    const oldNodes = [...env.amb.nodes], voices = [...env.amb.voices]; env.ambStop();
    assert.equal(env.amb.ctx, null); env.update(101);
    const newOut = env.amb.out, newNodes = env.amb.nodes;
    for (const timer of env.timers) timer();
    assert(oldNodes.every(n => n.edges.size === 0)); assert(voices.every(v => v.released));
    assert(newOut.edges.size > 0); assert(newNodes.some(n => n.kind === 'source' && !n.stopped));
  });
  test('Muting, missing player, disabling and per-group zero gain prevent unwanted playback', () => {
    const env = soundscape(); env.window.dmo.audio.settings.muted = true; env.update(100);
    assert.equal(env.amb.out.gain.value, 0); assert.equal(env.amb.voices.size, 0);
    env.window.dmo.audio.settings.muted = false; env.missingPlayer(); env.update(110);
    assert.equal(env.amb.out.gain.value, 0); assert.equal(env.amb.voices.size, 0);
    env.SETTINGS.ambientEnabled = false; env.update(120); assert.equal(env.amb.ctx, null);
    const zero = soundscape(); zero.SETTINGS.ambientWaves = zero.SETTINGS.ambientBirds = 0; zero.update(100);
    assert.equal(zero.amb.voices.size, 0);
  });
  test('Repeated renderer frames do not reschedule gains or spawn extra voices', () => {
    const env = soundscape(); env.update(100); const count = env.ctx.nodes.length;
    for (let n = 0; n < 6; n++) env.update(100 + n / 60);
    assert.equal(env.ctx.nodes.length, count); assert.equal(env.amb.lastUpdate, 100);
  });
}

test('Audio routing hooks apply once, retry after a failure, roll back and leave later owners alone', checkBootstrap);
test('Sample decoding finishes with complete, partial, failed and malformed recordings', checkDecoding);
checkAmbience();
