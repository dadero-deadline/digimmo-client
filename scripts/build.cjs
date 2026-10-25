'use strict';
// Offline build only. Never installs, uploads, launches the game or enables updates.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const channel = process.argv[2] || 'public';
if (!['public','development'].includes(channel)) throw new Error('Expected public or development');
const development = channel === 'development';
const read = file => fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n?/g,'\n');
const release = JSON.parse(read('package.json'));
const displayVersion = release.version.replace(/\.0$/,'');
const version = development ? displayVersion+'-dev1' : displayVersion;
const out = path.join(root,'dist',channel);
fs.mkdirSync(path.join(out,'client'),{recursive:true});
let script = read('src/tweaks.js');
script = script.replace('// ==/UserScript==', '// ==/UserScript==\n\n/*\n' + read('LICENSE').trim() + '\n\nProject code only. Embedded recordings retain the licenses and attribution\nlisted in the in-game Sound Credits and SOUND_CREDITS.md.\n*/');
const replace = (old,value) => {
  if (!script.includes(old)) throw new Error('Missing build marker: '+old.slice(0,90));
  script = script.replace(old,value);
};
replace('/* @ambience */',read('src/ambience.js'));
replace('__EMISSIVE_TILES__',JSON.stringify(JSON.parse(read('src/emissive-tiles.json'))));
replace('__SOUND_CREDITS__',JSON.stringify(JSON.parse(read('src/sound-credits.json')),null,2));
const manifest=JSON.parse(read('assets/audio/manifest.json'));
const samples={};
for(const item of manifest){
  const bytes=fs.readFileSync(path.join(root,'assets/audio/prepared',item.name+'.opus'));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw new Error('Audio hash mismatch: '+item.name);
  samples[item.name]=bytes.toString('base64');
}
replace('__AMB_SAMPLES__',JSON.stringify(samples,null,2));
script=script.replace(/0\.1-dev1/g,version);
// Explicit boundaries: development blocks are removed from public output, and a
// '// @public: ' line directly after a block supplies its public replacement.
const DEVELOPMENT_BLOCK=/^[ \t]*\/\/ @development-start\n[\s\S]*?^[ \t]*\/\/ @development-end\n/gm;
const PUBLIC_LINE=/^([ \t]*)\/\/ @public: (.*\n)/gm;
const boundaries=(text,file)=>{
  const count=marker=>(text.match(new RegExp('^[ \\t]*// @development-'+marker+'$','gm'))||[]).length;
  if(count('start')!==count('end'))throw new Error('Unbalanced development markers in '+file);
  if(development)return text;
  const result=text.replace(DEVELOPMENT_BLOCK,'').replace(PUBLIC_LINE,'$1$2');
  if(/@development-(?:start|end)|\/\/ @public: /.test(result))throw new Error('Nested or stray build marker in '+file);
  return result;
};
script=boundaries(script,'src/tweaks.js');
if(!development){
  // Remove obsolete development help from the translation dictionary as well.
  const translationMarker='  const TRANSLATIONS = ';
  const x=script.indexOf(translationMarker)+translationMarker.length,y=script.indexOf('\n  const ',x);
  // Source translations are ordinary JSON; the semicolon ends the object.
  const block=script.slice(x,y).trim().replace(/;$/,'');
  const translations=JSON.parse(block);
  for(const entries of Object.values(translations))for(const key of Object.keys(entries))
    if(key.startsWith('Development only:'))delete entries[key];
  script=script.slice(0,x)+JSON.stringify(translations,null,2)+';\n'+script.slice(y);
  if(/Ctrl\+Alt\+P|cyclePreview|diagnostics:|getStats:|PREVIEWS|Shift\+F10/.test(script))throw new Error('Development feature in public output');
}
new vm.Script(script,{filename:'tweaks.user.js'});
fs.writeFileSync(path.join(out,'digimmo-tweaks.user.js'),script);
fs.writeFileSync(path.join(out,'client/tweaks.user.js'),script);
for(const file of ['main.js','preload.js','updater.js','discord.js']){
  let code=read('client/'+file).replace(/__DEVELOPMENT__/g,String(development));
  code=boundaries(code,'client/'+file);
  new vm.Script(code,{filename:file});
  fs.writeFileSync(path.join(out,'client',file),code);
}
fs.copyFileSync(path.join(root,'client/icon.png'),path.join(out,'client/icon.png'));
fs.copyFileSync(path.join(root,'client/icon.ico'),path.join(out,'client/icon.ico'));
fs.writeFileSync(path.join(out,'client/package.json'),JSON.stringify({name:'digimmo-client',productName:'DigiMMO',version:release.version,description:release.description,license:release.license,main:'main.js',private:true},null,2)+'\n');
for(const browser of ['chromium','firefox']){
  const folder=path.join(out,'extension-'+browser);
  fs.mkdirSync(path.join(folder,'icons'),{recursive:true});
  const extension=JSON.parse(read('extension/manifest.json'));
  extension.version=release.version;
  extension.version_name=version;
  if(development)extension.name+=' (Development)';
  if(browser==='chromium')delete extension.browser_specific_settings;
  fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(extension,null,2)+'\n');
  fs.writeFileSync(path.join(folder,'digimmo-tweaks.js'),script);
  for(const icon of Object.values(extension.icons))fs.copyFileSync(path.join(root,'extension',icon),path.join(folder,icon));
  for(const file of ['LICENSE','SOUND_CREDITS.md','CHANGELOG.md'])fs.copyFileSync(path.join(root,file),path.join(folder,file));
  fs.writeFileSync(path.join(folder,'README.md'),read('extension/README.md').replace(/\(\.\.\//g,'('));
  fs.writeFileSync(path.join(folder,'KEYBOARD.md'),development?read('KEYBOARD.md'):read('KEYBOARD.md').split('## Development builds only')[0].trim()+'\n');
}
for(const file of ['LICENSE','README.md','CONTRIBUTING.md','UPDATES.md','SOUND_CREDITS.md','KEYBOARD.md','CHANGELOG.md'])fs.copyFileSync(path.join(root,file),path.join(out,file));
if(!development)fs.writeFileSync(path.join(out,'KEYBOARD.md'),read('KEYBOARD.md').split('## Development builds only')[0].trim()+'\n');
if(process.argv.includes('--stage-test')){
  if(!development)throw new Error('Only development output may replace the test candidate');
  const tests=path.resolve(root,'../tests');
  if(!fs.existsSync(path.join(tests,'TASKS.md')))throw new Error('Expected local test workspace');
  fs.writeFileSync(path.join(tests,'digimmo-tweaks-test.user.js'),script);
}
console.log(`Built ${version} (${channel}), ${Buffer.byteLength(script)} bytes, ${manifest.length} audio samples. No installation or publication.`);
// The branded development runtime reads ordinary files, so Ctrl+R sees a rebuild.
const devApp=path.join(out,'windows/win-unpacked/resources/app');
if(development && fs.existsSync(path.join(devApp,'main.js'))){
  for(const file of ['main.js','preload.js','updater.js','discord.js','tweaks.user.js','icon.png','icon.ico'])
    fs.copyFileSync(path.join(out,'client',file),path.join(devApp,file));
  const metadata=JSON.parse(fs.readFileSync(path.join(devApp,'package.json'),'utf8'));
  metadata.version=release.version;
  fs.writeFileSync(path.join(devApp,'package.json'),JSON.stringify(metadata,null,2)+'\n');
}
