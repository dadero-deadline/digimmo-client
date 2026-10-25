'use strict';
// Portable artifact checks. No browser, Electron process or network required.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const release=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const audio=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/manifest.json'),'utf8'));
const sourceCredits=JSON.parse(fs.readFileSync(path.join(root,'src/sound-credits.json'),'utf8'));
const license=fs.readFileSync(path.join(root,'LICENSE'),'utf8').replace(/\r\n?/g,'\n').trim();
for(const channel of ['public','development']){
 const folder=path.join(root,'dist',channel),text=fs.readFileSync(path.join(folder,'digimmo-tweaks.user.js'),'utf8');
 new vm.Script(text);
 assert(text.includes(license),'Standalone userscript includes the license and copyright notice');
 const get=(start,end)=>{const a=text.indexOf(start),b=text.indexOf(end,a);assert(a>=0&&b>a,start+' boundary');return text.slice(a,b);};
 const translations=vm.runInNewContext(get('  const TRANSLATIONS = ','  const supportedLanguage =')+'TRANSLATIONS');
 const notes=vm.runInNewContext(get('  const CHANGELOG_ENTRIES = ','  const localizedChangelog =')+'CHANGELOG_ENTRIES');
 const credits=vm.runInNewContext(get('  const SOUND_CREDITS = ','  const AMB_SAMPLES = ')+'SOUND_CREDITS');
 // Packaging patches need not add entries to the visual/audio changelog.
 assert(notes.length>0);assert.match(notes[0][0],/^\d+\.\d+(?:\.\d+)?$/);
 assert.equal(JSON.stringify(credits),JSON.stringify(sourceCredits));
 for(const lang of ['es','pt']){
  for(const note of notes)assert(translations[lang][note[1]],lang+' release note: '+note[0]);
  for(const credit of credits)assert(translations[lang][credit.changes],lang+' processing credit: '+credit.title);
 }
 const names=credits.flatMap(c=>c.samples.split(', '));
 assert.equal(new Set(names).size,names.length,'Every sample has exactly one credit');
 assert.deepEqual([...names].sort(),audio.map(sample=>sample.name).sort(),'Audio manifest and credits match');
 for(const file of ['main.js','preload.js','updater.js','discord.js'])new vm.Script(fs.readFileSync(path.join(folder,'client',file),'utf8'));
 assert.equal(fs.readFileSync(path.join(folder,'client/tweaks.user.js'),'utf8'),text);
 assert.equal(JSON.parse(fs.readFileSync(path.join(folder,'client/package.json'),'utf8')).version,release.version);
 for(const browser of ['chromium','firefox']){
  const extension=path.join(folder,'extension-'+browser);
  const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8'));
  assert.equal(manifest.version,release.version);
  assert.equal(manifest.manifest_version,3);
  assert.deepEqual(manifest.content_scripts,[{matches:['https://play.digimmo.com.br/*'],js:['digimmo-tweaks.js'],run_at:'document_start',world:'MAIN',all_frames:false}]);
  assert(!manifest.permissions&&!manifest.host_permissions&&!manifest.background&&!manifest.update_url);
  assert.equal(fs.readFileSync(path.join(extension,'digimmo-tweaks.js'),'utf8'),text,'Same script in every target');
  assert.equal(!!manifest.browser_specific_settings,browser==='firefox');
  for(const [size,icon]of Object.entries(manifest.icons)){
   const png=fs.readFileSync(path.join(extension,icon));
   assert.equal(png.readUInt32BE(16),Number(size));assert.equal(png.readUInt32BE(20),Number(size));
  }
  assert(fs.existsSync(path.join(extension,'SOUND_CREDITS.md')));
  assert.equal(fs.readFileSync(path.join(extension,'LICENSE'),'utf8').trim(),fs.readFileSync(path.join(root,'LICENSE'),'utf8').trim());
  assert(fs.readFileSync(path.join(extension,'SOUND_CREDITS.md'),'utf8').includes('## Artwork'));
 }
 assert.deepEqual(fs.readFileSync(path.join(folder,'client/icon.png')),fs.readFileSync(path.join(root,'assets/branding/icon-digimmo.png')));
 if(channel==='public'){
  assert(!/Ctrl\+Alt\+P|cyclePreview|diagnostics:|getStats:|Shift\+F10|dev1/.test(text));
  const main=fs.readFileSync(path.join(folder,'client/main.js'),'utf8'),preload=fs.readFileSync(path.join(folder,'client/preload.js'),'utf8');
  assert(main.includes('const DEVELOPMENT = false;'));assert(!/toggleDevTools|openDevTools/.test(main));
  assert(!preload.includes('process.argv'));assert(!preload.includes('userData'));
 }
 console.log('PASS '+channel+': syntax, identical client/extension scripts, scoped manifests/icons, localized release notes and complete credits for '+audio.length+' samples.');
}
