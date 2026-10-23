'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar'),yaml=require('js-yaml');
const {NtExecutable,NtExecutableResource,Resource,Data}=require('resedit');
const root=path.resolve(__dirname,'..'),output=path.join(root,'dist/installer');
const release=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const info=yaml.load(fs.readFileSync(path.join(output,'latest.yml'),'utf8'));
assert.equal(info.version,release.version);
for(const file of info.files){
  assert.equal(path.basename(file.url),file.url);
  const bytes=fs.readFileSync(path.join(output,file.url));
  assert.equal(bytes.length,file.size);
  assert.equal(crypto.createHash('sha512').update(bytes).digest('base64'),file.sha512);
  assert.equal(bytes.toString('ascii',0,2),'MZ');
  assert(fs.statSync(path.join(output,file.url+'.blockmap')).size>0);
}
const resources=path.join(output,'win-unpacked/resources'),archive=path.join(resources,'app.asar');
const appPackage=JSON.parse(asar.extractFile(archive,'package.json').toString());
assert.equal(appPackage.version,release.version);assert.equal(appPackage.main,'main.js');
assert.equal(appPackage.name,'digimmo-client');assert(!appPackage.devDependencies);
assert.equal(appPackage.license,release.license);
for(const file of ['main.js','preload.js','updater.js','tweaks.user.js','icon.png'])
  assert.deepEqual(asar.extractFile(archive,file),fs.readFileSync(path.join(root,'dist/public/client',file)));
assert.equal(JSON.parse(asar.extractFile(archive,path.join('node_modules','electron-updater','package.json'))).version,release.dependencies['electron-updater']);
const entries=asar.listPackage(archive).map(n=>n.replaceAll('\\','/'));
assert(!entries.some(n=>/^\/(src|scripts|tests|assets|dist)\//.test(n)));
assert(!entries.some(n=>/^\/node_modules\/(electron|electron-builder|app-builder-lib)\//.test(n)));
const feed=yaml.load(fs.readFileSync(path.join(resources,'app-update.yml'),'utf8'));
for(const file of ['LICENSE','UPDATES.md','SOUND_CREDITS.md','KEYBOARD.md','CHANGELOG.md'])
  assert.deepEqual(fs.readFileSync(path.join(resources,file)),fs.readFileSync(path.join(root,'dist/public',file)));
assert.equal(feed.provider,'github');assert.equal(feed.owner,'dadero-deadline');assert.equal(feed.repo,'digimmo-client');
assert(!feed.token&&!feed.private&&!feed.requestHeaders);
assert(!fs.existsSync(path.join(resources,'digimmo-installed')),'Unpacked output must remain outside updates');
assert.deepEqual(fs.readFileSync(path.join(output,'win-unpacked/scripts/digimmo-tweaks.user.js')),fs.readFileSync(path.join(root,'dist/public/digimmo-tweaks.user.js')));
const extension=path.join(root,'dist/public/extension-chromium');
for(const entry of fs.readdirSync(extension,{recursive:true})){
  const source=path.join(extension,entry);
  if(fs.statSync(source).isFile())assert.deepEqual(fs.readFileSync(path.join(output,'win-unpacked/extension',entry)),fs.readFileSync(source),'Installer must retain browser file: '+entry);
}
assert(fs.readFileSync(path.join(root,'client/installer.nsh'),'utf8').includes('$INSTDIR\\resources\\digimmo-installed'));
const icon=Data.IconFile.from(fs.readFileSync(path.join(root,'client/icon.ico')));
const iconHash=item=>crypto.createHash('sha256').update(Buffer.from(item.isRaw()?item.bin:item.generate())).digest('hex');
const expectedIcons=icon.icons.map(i=>iconHash(i.data)).sort();
for(const executable of [path.join(output,'win-unpacked/DigiMMO.exe'),...info.files.map(f=>path.join(output,f.url))]){
  const exeResources=NtExecutableResource.from(NtExecutable.from(fs.readFileSync(executable)));
  const groups=Resource.IconGroupEntry.fromEntries(exeResources.entries);
  assert(groups.some(group=>JSON.stringify(group.getIconItemsFromEntries(exeResources.entries).map(iconHash).sort())===JSON.stringify(expectedIcons)),'Official icon frames missing in '+executable);
}
const sums=info.files.flatMap(f=>[f.url,f.url+'.blockmap']).concat('latest.yml').map(name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(output,name))).digest('hex')+'  '+name);
fs.writeFileSync(path.join(output,'SHA256SUMS.txt'),sums.join('\n')+'\n');
console.log('PASS installer: SHA512 metadata, blockmap, exact application files, official executable icons, credits, runtime dependencies, GitHub feed, installation marker and SHA256 sums.');
