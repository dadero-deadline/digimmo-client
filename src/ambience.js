      const amb = { ctx: null };
      const isNature = /forest|grass|meadow|savanna|valley|hill|wood|lake|village|overdell/i.test(mapText);
      // Only placed sea tiles can produce coastal sound. Shared atlases cannot.
      const namedShore = localWater.shore;
      const shorelineWater = namedShore.length >= 12 ? namedShore : [];
      const isCoast = shorelineWater.length >= 12;
      const windyMap = weather.some(w => /Sandstorm|Snow|Sea spray/.test(w.name));
      const windPhase = Math.random() * 100;
      const firePos = lights.filter(l => /campfire|bonfire|brazier/i.test(l.def.test.source));
      // Furnace masks identify real fire apertures; no sound for unlit metal.
      for (const light of fxLights) if (light.kind === 'furnace') firePos.push(light);
      const soundProfile = (() => {
        const m = mapText.toLowerCase();
        const p = { name: 'quiet', wind: 0.045, crickets: 0, machine: 0, town: 0, calls: 0, gulls: isCoast ? 0.20 : 0 };
        if (isNature) Object.assign(p, { name: 'woodland', wind: 0.07, crickets: 0.04, calls: 0.14 });
        if (windyMap) p.wind = 0.18;
        if (/bay|shore|sea(?:\b|_)/.test(m)) Object.assign(p, { name: 'coast', wind: 0.14, crickets: 0.008, calls: 0 });
        if (/savanna|desert|canyon|dune|mesa/.test(m)) Object.assign(p, { name: 'drylands', wind: 0.22, crickets: 0.02, calls: 0.08 });
        if (/village|toy.?town/.test(m)) Object.assign(p, { name: 'village', wind: 0.05, crickets: 0.0225, calls: 0.08, town: 0 });
        if (/odaiba|highton|fog.?city|plaza|street/.test(m)) Object.assign(p, { name: 'city', wind: 0.05, crickets: 0, calls: 0, town: 0.13 });
        if (/factor|factory|fortress|spiral.?city/.test(m)) Object.assign(p, { name: 'industry', wind: 0.035, crickets: 0, calls: 0, machine: 0.16, town: 0 });
        if (/freeze|snow|ice|holy|summit|glacier/.test(m)) Object.assign(p, { name: 'highlands', wind: 0.24, crickets: 0, calls: 0, town: 0, machine: 0 });
        if (/network|realm|dream|apocalymon|darkness|keep|castle/.test(m)) Object.assign(p, { name: 'remote', wind: 0.045, crickets: 0, calls: 0, town: 0, machine: 0, gulls: 0 });
        return p;
      })();
      const windSound = (() => {
        // Shape the same recording without changing its pitch or playback speed.
        const [high, low, pace] = ({
          woodland: [200, 1450, 1.1], village: [180, 1600, 1.15], city: [180, 1900, 1],
          coast: [150, 1800, 1.2], drylands: [160, 900, 1.35], highlands: [650, 2100, 0.85],
          industry: [280, 1300, 1.25], remote: [240, 1150, 1.4],
        })[soundProfile.name] || [200, 1600, 1];
        let seed = 0;
        for (const c of mapText.split(' ')[0]) seed = (Math.imul(seed, 31) + c.charCodeAt(0)) >>> 0;
        const variation = 0.92 + (seed % 17) / 100;
        return { high: high * variation, low: low * variation, pace: pace * variation };
      })();
      const stats = { lights: lights.length, water: water.length, runningWater: runningWater.length,
        casters: casters.length, trees: treeGroups.length, canopyLayers: trees.length, cloudsInView: 0, season,
        shadowObjects: objectCells.size, largestObject: Math.max(0, ...[...objectCells.values()].map(c => c.length)), trunkTiles: trunkOwner.size, shadowSlices: shadowParts.length, ownedSlices,
        coast: isCoast, shorelineTiles: shorelineWater.length, waveGain: 0, reflectionCandidates: 0,
        ambience: soundProfile.name, weather: weather.concat(extra).map(w => w.name).join('+') || 'none' };
      const ambStop = () => {
        if (!amb.ctx) return;
        const ctx = amb.ctx, nodes = amb.nodes || [], voices = amb.voices || new Set();
        try { const t = ctx.currentTime; amb.out?.gain.cancelScheduledValues(t); amb.out?.gain.setTargetAtTime(0, t, 0.18); } catch {}
        // Capture this generation: a quick restart must not dispose its new nodes.
        setTimeout(() => {
          for (const voice of [...voices]) voice.release();
          for (const n of nodes) { try { n.stop?.(); } catch {} try { n.disconnect(); } catch {} }
        }, 1200);
        amb.ctx = null;
      };
      cleanups.push(ambStop);
      const ambNode = (method) => {
        const node = amb.ctx[method]();
        amb.nodes.push(node);
        return node;
      };
      const ambStart = (ctx, dest) => {
        amb.ctx = ctx; amb.nodes = []; amb.voices = new Set(); amb.sv = null;
        amb.samples = ensureSamples(ctx); amb.lastUpdate = -Infinity; amb.lastSample = {};
        amb.nextWave = ctx.currentTime + 3 + Math.random() * 4;
        amb.nextBird = ctx.currentTime + 30 + Math.random() * 30;
        amb.nextGull = ctx.currentTime + 45 + Math.random() * 45;
        amb.nextCricket = ctx.currentTime + 35 + Math.random() * 35; amb.nextCrackle = ctx.currentTime;
        try {
          const out = ambNode('createGain'); out.gain.value = 0; out.connect(dest); amb.out = out;
          amb.groups = {};
          for (const id of ['wind', 'birds', 'crickets', 'fire', 'water', 'waves']) {
            const group = ambNode('createGain'); group.gain.value = SETTINGS['ambient' + id[0].toUpperCase() + id.slice(1)];
            group.connect(out); amb.groups[id] = group;
          }
          const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          amb.noise = buf;
          const noiseBed = (group, type, frequency, q) => {
            const src = ambNode('createBufferSource'), f = ambNode('createBiquadFilter'), g = ambNode('createGain'), p = ambNode('createStereoPanner');
            src.buffer = buf; src.loop = true; f.type = type; f.frequency.value = frequency; f.Q.value = q; g.gain.value = 0;
            src.connect(f); f.connect(g); g.connect(p); p.connect(amb.groups[group]); src.start(0, Math.random() * 2);
            return { f, g, p };
          };
          amb.wind = noiseBed('wind', 'bandpass', Math.sqrt(windSound.high * windSound.low), 0.6);
          amb.water = noiseBed('water', 'bandpass', 1200, 1.6);
          amb.sea = noiseBed('waves', 'lowpass', 600, 0.5);
        } catch (error) { ambStop(); throw error; }
      };
      // Every transient owns all of its nodes and can be released on map exit.
      const transient = (group) => {
        const ctx = amb.ctx, owner = amb.voices, nodes = [];
        const v = { ctx, node(method) { const n = ctx[method](); nodes.push(n); return n; },
          release() {
            if (v.released) return;
            v.released = true;
            owner.delete(v);
            for (const n of nodes) { n.onended = null; try { n.stop?.(); } catch {} try { n.disconnect(); } catch {} }
          } };
        owner.add(v);
        try {
          v.g = v.node('createGain'); v.p = v.node('createStereoPanner');
          v.g.connect(v.p); v.p.connect(amb.groups[group]);
          return v;
        } catch (error) { v.release(); throw error; }
      };
      const ambChirp = (t, pan) => {
        const v = transient('birds');
        try {
          const o = v.node('createOscillator'); o.type = 'sine';
          o.frequency.setValueAtTime(2900, t); o.frequency.exponentialRampToValueAtTime(3800, t + 0.15);
          v.g.gain.setValueAtTime(0, t); v.g.gain.linearRampToValueAtTime(0.008, t + 0.025); v.g.gain.linearRampToValueAtTime(0, t + 0.2);
          v.p.pan.value = pan; o.connect(v.g); o.onended = v.release; o.start(t); o.stop(t + 0.22);
        } catch (error) { v.release(); throw error; }
      };
      const ambCricket = (t, pan, f) => {
        const v = transient('crickets');
        try {
          const o = v.node('createOscillator'); o.type = 'sine'; o.frequency.value = f; v.g.gain.value = 0; v.p.pan.value = pan;
          for (let i = 0; i < 3; i++) { const start = t + i * 0.045; v.g.gain.setValueAtTime(0, start); v.g.gain.linearRampToValueAtTime(0.00075, start + 0.004); v.g.gain.linearRampToValueAtTime(0, start + 0.028); }
          o.connect(v.g); o.onended = v.release; o.start(t); o.stop(t + 0.2);
        } catch (error) { v.release(); throw error; }
      };
      const ambCrackle = (t, pan, vol) => {
        const v = transient('fire');
        try {
          const src = v.node('createBufferSource'), f = v.node('createBiquadFilter');
          src.buffer = amb.noise; f.type = 'lowpass'; f.frequency.value = 1100; f.Q.value = 0.5; v.p.pan.value = pan;
          v.g.gain.setValueAtTime(0, t); v.g.gain.linearRampToValueAtTime(vol, t + 0.01); v.g.gain.linearRampToValueAtTime(0, t + 0.065);
          src.connect(f); f.connect(v.g); src.onended = v.release; src.start(t, Math.random() * 1.5, 0.08);
        } catch (error) { v.release(); throw error; }
      };
      const sampleBed = (name, group) => {
        const buffer = amb.samples.buffers[name];
        if (!buffer) return;
        const src = ambNode('createBufferSource'), g = ambNode('createGain'), p = ambNode('createStereoPanner');
        src.buffer = buffer; src.loop = true; g.gain.value = 0;
        if (name === 'wind') {
          const high = ambNode('createBiquadFilter'), low = ambNode('createBiquadFilter');
          high.type = 'highpass'; high.frequency.value = windSound.high; high.Q.value = 0.5;
          low.type = 'lowpass'; low.frequency.value = windSound.low; low.Q.value = 0.5;
          src.connect(high); high.connect(low); low.connect(g);
        } else src.connect(g);
        g.connect(p); p.connect(amb.groups[group]); src.start(0, Math.random() * buffer.duration);
        amb.sv[name] = { g, p };
      };
      const sampleOnce = (name, group, gain, pan, t, location = null, maxDuration = Infinity, startOffset = 0) => {
        const buffer = amb.samples.buffers[name];
        if (!buffer || gain <= 0.0005) return 0;
        const v = transient(group);
        try {
          const src = v.node('createBufferSource'); src.buffer = buffer;
          // Keep real voices at their recorded pitch and pace.
          const duration = Math.min(buffer.duration, maxDuration);
          const offset = Math.max(0, Math.min(startOffset, buffer.duration - duration));
          v.location = location; v.baseGain = gain; v.end = t + duration;
          const me = ownPos();
          const initial = location ? (me ? falloff(Math.hypot(location.x - me.x, location.y - me.y), location.range) *
            (location.daytime ? smooth(0.25, 0.75, 1 - s.dark) : location.nighttime ? 1 - smooth(0.2, 0.6, 1 - s.dark) : 1) : 0) : 1;
          v.g.gain.value = 0; v.g.gain.setTargetAtTime(gain * initial, t, 0.12);
          v.p.pan.value = Math.max(-0.85, Math.min(0.85, pan));
          // A separate envelope keeps distance updates from cancelling the end fade.
          const envelope = v.node('createGain');
          envelope.gain.setValueAtTime(0, t);
          envelope.gain.linearRampToValueAtTime(1, t + Math.min(0.12, duration / 4));
          envelope.gain.setValueAtTime(1, t + Math.max(0.12, duration - 0.4));
          envelope.gain.linearRampToValueAtTime(0, t + duration);
          src.connect(envelope); envelope.connect(v.g); src.onended = v.release; src.start(t, offset, duration);
          return duration;
        } catch (error) { v.release(); throw error; }
      };
      const falloff = (d, range) => d >= range ? 0 : (1 - d / range) * (1 - d / range);
      const nearestSound = (points, me, range, offset = 0) => {
        let distance = Infinity, x = me.x, y = me.y;
        for (const point of points) {
          const px = point.x + offset, py = point.y + offset, d = Math.hypot(px - me.x, py - me.y);
          if (d < distance) { distance = d; x = px; y = py; }
        }
        return { x, y, range, gain: falloff(distance, range), pan: Math.max(-0.85, Math.min(0.85, (x - me.x) / range)) };
      };
      const waterfallPos = runningWater.filter(w => w.fall);
      const streamPos = runningWater.filter(w => !w.fall);
      const chooseSample = (kind, names) => {
        if (!names.length) return null;
        const other = names.filter(name => name !== amb.lastSample[kind]);
        const choices = other.length ? other : names;
        return (amb.lastSample[kind] = choices[(Math.random() * choices.length) | 0]);
      };
      const ambUpdate = (time) => {
        const a = window.dmo && window.dmo.audio, ctx = a && a.ctx;
        if (!SETTINGS.ambientEnabled || !ctx || ctx.state !== 'running' || !a.master) {
          if (amb.ctx && (!SETTINGS.ambientEnabled || amb.ctx !== ctx || !a?.master)) ambStop();
          return;
        }
        if (amb.ctx !== ctx) { ambStop(); ambStart(ctx, a.master); }
        const t = ctx.currentTime;
        // Audio gains do not need a tile scan on every rendered frame.
        if (t - amb.lastUpdate < 0.12) return;
        amb.lastUpdate = t;
        const me = ownPos(), muted = a.settings?.muted;
        amb.out.gain.setTargetAtTime(me && !muted ? AMBIENT.volume : 0, t, 0.35);
        for (const [id, group] of Object.entries(amb.groups))
          group.gain.setTargetAtTime(SETTINGS['ambient' + id[0].toUpperCase() + id.slice(1)], t, 0.08);
        if (!me) { stats.waveGain = 0; return; }
        const P = soundProfile, day = 1 - s.dark;
        const dayMix = smooth(0.25, 0.75, day), nightMix = 1 - smooth(0.2, 0.6, day);
        const gt = (time / 1000 + windPhase) / windSound.pace;
        const gust = Math.max(0, Math.min(1, 0.6 + 0.25 * Math.sin(gt / 11.3) + 0.15 * Math.sin(gt / 4.7 + 1.9) * Math.sin(gt / 17.1)));
        if (!amb.sv && amb.samples?.ready) {
          amb.sv = {};
          for (const [name, group, needed] of [
            ['wind', 'wind', P.wind],
            ['machine', 'wind', P.machine], ['town', 'wind', P.town],
            ['waterfall', 'water', waterfallPos.length], ['stream', 'water', streamPos.length],
            ['fountain', 'water', localWater.fountains.length], ['lake', 'water', localWater.lake.length],
            ['sea', 'waves', isCoast], ['fire', 'fire', firePos.length],
          ]) if (needed) sampleBed(name, group);
        }
        const sv = amb.sv || {}, buffers = amb.sv ? amb.samples.buffers : {};
        const loaded = Object.keys(amb.samples?.buffers || {}).length;
        stats.samples = !amb.samples?.ready ? 'loading' : loaded === amb.samples.total && loaded > 0 ? 'recorded' : loaded ? 'mixed' : 'synth';
        stats.sampleLoaded = loaded; stats.sampleTotal = amb.samples?.total || 0; stats.sampleFailures = amb.samples?.failed.join(', ') || 'none';
        const set = (name, gain, pan = 0) => {
          const v = sv[name]; if (!v) return;
          v.g.gain.setTargetAtTime(gain, t, 0.55); v.p.pan.setTargetAtTime(pan, t, 0.25);
        };
        const fall = nearestSound(waterfallPos, me, 280, 8), creek = nearestSound(streamPos, me, 150, 8);
        const fire = nearestSound(firePos, me, 170), shore = nearestSound(shorelineWater, me, 240);
        const lake = nearestSound(localWater.lake, me, 145);
        // A large fountain is a little louder and carries farther. Nearby
        // fountains never add into an unbounded stack of identical loops.
        let fountain = { gain: 0, pan: 0 };
        for (const point of localWater.fountains) {
          const sound = nearestSound([point], me, point.range);
          sound.gain *= point.level;
          if (sound.gain > fountain.gain) fountain = sound;
        }
        const nightWind = ({ woodland: 0.65, village: 0.6, city: 0.65, coast: 0.85, drylands: 0.6, highlands: 0.8 })[P.name] ?? 0.8;
        // Cities crossfade daytime traffic into quiet wind at night.
        const windMix = P.name === 'city' ? 1 - dayMix : nightWind + (1 - nightWind) * dayMix;
        const windGain = P.wind * (0.7 + 0.3 * gust) * windMix;
        set('wind', windGain);
        set('machine', P.machine); set('town', P.town * dayMix);
        set('waterfall', 0.62 * fall.gain, fall.pan); set('stream', 0.40 * creek.gain, creek.pan);
        set('fountain', fountain.gain, fountain.pan); set('lake', 0.28 * lake.gain, lake.pan);
        set('fire', 0.26 * fire.gain, fire.pan); set('sea', 0.25 * shore.gain, shore.pan * 0.6);
        // Existing waves and calls remain at their world position as the player moves.
        for (const v of amb.voices) {
          if (!v.location) continue;
          const loc = v.location, distance = Math.hypot(loc.x - me.x, loc.y - me.y);
          const light = loc.daytime ? dayMix : loc.nighttime ? nightMix : 1;
          v.g.gain.setTargetAtTime(v.baseGain * falloff(distance, loc.range) * light, t, 0.16);
          v.p.pan.setTargetAtTime(Math.max(-0.85, Math.min(0.85, (loc.x - me.x) / loc.range)), t, 0.18);
        }
        const waves = ['wave1', 'wave2', 'wave3', 'wave4'].filter(name => buffers[name]);
        const calls = ['birds', 'chirp1', 'chirp2', 'chirp3'].filter(name => buffers[name]);
        const gulls = ['gull1', 'gull2'].filter(name => buffers[name]);
        const audible = !muted && AMBIENT.volume > 0;
        const play = (kind, names, group, gain, location, pauseMin, pauseSpread, maxDuration = Infinity) => {
          const name = chooseSample(kind, names);
          if (!name) return t + pauseMin;
          const offset = kind === 'bird' ? Math.random() * Math.max(0, buffers[name].duration - maxDuration) : 0;
          const duration = sampleOnce(name, group, gain, location.pan || 0, t + 0.04, location, maxDuration, offset);
          return t + 0.04 + duration + pauseMin + Math.random() * pauseSpread;
        };
        if (t >= amb.nextWave) {
          amb.nextWave = audible && SETTINGS.ambientWaves > 0 && shore.gain > 0.025 && waves.length
            ? play('wave', waves, 'waves', 0.42, shore, 5, 9) : t + 2;
        }
        // Birds have one schedule and no continuous bed underneath their calls.
        if (t >= amb.nextBird) {
          const nearby = treeGroups.filter(tree => Math.hypot(tree.x - me.x, tree.y - me.y) < 160);
          const tree = nearby[(Math.random() * nearby.length) | 0];
          amb.nextBird = t + 6;
          if (audible && SETTINGS.ambientBirds > 0 && P.calls > 0 && dayMix > 0.5 && tree) {
            if (calls.length) amb.nextBird = play('bird', calls, 'birds', P.calls,
              { x: tree.x, y: tree.y, range: 180, daytime: true }, 55, 55, 3.2);
            else if (amb.samples?.ready) {
              ambChirp(t + 0.02, Math.max(-0.85, Math.min(0.85, (tree.x - me.x) / 180)));
              amb.nextBird = t + 55 + Math.random() * 55;
            }
          }
        }
        if (t >= amb.nextGull) {
          amb.nextGull = audible && SETTINGS.ambientBirds > 0 && P.gulls > 0 && dayMix > 0.4 && shore.gain > 0.04 && gulls.length
            ? play('gull', gulls, 'birds', P.gulls * 0.7, { ...shore, daytime: true }, 90, 90, 2.2) : t + 10;
        }
        // Per-source fallback: a missing stream must not silence it just because
        // the waterfall decoded. No synthesized detail is added over recordings.
        const missing = [!sv.waterfall && fall, !sv.stream && { gain: 0.6 * creek.gain, pan: creek.pan },
          !sv.fountain && fountain, !sv.lake && { gain: 0.3 * lake.gain, pan: lake.pan }]
          .filter(Boolean).sort((a, b) => b.gain - a.gain)[0] || { gain: 0, pan: 0 };
        amb.wind.g.gain.setTargetAtTime(sv.wind ? 0 : 0.045 * windGain, t, 0.6);
        amb.water.g.gain.setTargetAtTime(0.035 * missing.gain, t, 0.3); amb.water.p.pan.setTargetAtTime(missing.pan, t, 0.25);
        amb.sea.g.gain.setTargetAtTime(sv.sea ? 0 : 0.018 * shore.gain, t, 0.6);
        amb.sea.p.pan.setTargetAtTime(shore.pan * 0.6, t, 0.25);
        if (audible && SETTINGS.ambientCrickets > 0 && P.crickets > 0 && nightMix > 0.5 && t >= amb.nextCricket) {
          if (buffers.crickets) {
            const angle = Math.random() * Math.PI * 2;
            amb.nextCricket = play('cricket', ['crickets'], 'crickets', P.crickets * 0.75,
              { x: me.x + Math.cos(angle) * 24, y: me.y + Math.sin(angle) * 24, range: 180, nighttime: true }, 75, 75, 3.2);
          } else {
            ambCricket(t + 0.02, Math.random() - 0.5, 4500); amb.nextCricket = t + 75 + Math.random() * 75;
          }
        }
        if (audible && !sv.fire && fire.gain > 0 && t >= amb.nextCrackle) {
          ambCrackle(t + 0.02, fire.pan, 0.015 * fire.gain); amb.nextCrackle = t + 0.5 + Math.random();
        }
        stats.windGain = windGain; stats.waterGain = 0.62 * fall.gain + 0.40 * creek.gain + fountain.gain + 0.28 * lake.gain;
        stats.fountains = localWater.fountains.length; stats.fountainGain = fountain.gain; stats.lakeGain = 0.28 * lake.gain;
        stats.waveGain = shore.gain; stats.activeSounds = amb.voices.size;
      };
