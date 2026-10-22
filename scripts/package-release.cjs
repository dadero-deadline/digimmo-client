'use strict';
// Local release files only. Uploading and publishing are separate maintainer actions.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { ZipFile } = require('yazl');

const root = path.resolve(__dirname, '..');
const release = require('../package.json');
const installer = process.argv.includes('--installer');
const publicDir = path.join(root, 'dist/public');
const output = path.join(root, 'dist', installer ? 'releases' : 'extensions', release.version);

function files(folder, prefix = '') {
  return fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error('Unexpected link in package input: ' + relative);
    return entry.isDirectory() ? files(path.join(folder, entry.name), relative + '/') : [relative];
  });
}

async function archiveEntries(entries, destination) {
  const zip = new ZipFile();
  zip.on('error', error => zip.outputStream.destroy(error));
  const temporary = destination + '.tmp';
  const writing = pipeline(zip.outputStream, fs.createWriteStream(temporary));
  try {
    for (const entry of entries) zip.addFile(entry.source, entry.name, {compress:!entry.name.endsWith('.exe')});
    zip.end();
    await writing;
    fs.renameSync(temporary, destination);
  } catch (error) {
    zip.outputStream.destroy(error);
    await writing.catch(() => {});
    throw error;
  }
}

const archive=(folder,destination)=>archiveEntries(files(folder).map(name=>({source:path.join(folder,name),name})),destination);

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const names = [];
  if (installer) {
    const unpacked=path.join(root,'dist/installer/win-unpacked');
    const extension=path.join(publicDir,'extension-chromium');
    const marker=path.join(root,'dist/installer/zip-installed');
    fs.writeFileSync(marker,'zip');
    await archiveEntries([
      ...files(unpacked).filter(name=>name.replaceAll('\\','/')!=='resources/digimmo-installed').map(name=>({source:path.join(unpacked,name),name})),
      {source:marker,name:'resources/digimmo-installed'},
      {source:path.join(publicDir,'digimmo-tweaks.user.js'),name:'scripts/digimmo-tweaks.user.js'},
      ...files(extension).map(name=>({source:path.join(extension,name),name:'extension/'+name}))
    ],path.join(output,'DigiMMO.zip'));
    names.push('DigiMMO.zip');
    const setup = `DigiMMO-Setup-${release.version}-x64.exe`;
    for (const name of [setup, setup + '.blockmap', 'latest.yml']) {
      fs.copyFileSync(path.join(root, 'dist/installer', name), path.join(output, name));
      names.push(name);
    }
  } else {
    for (const browser of ['chromium', 'firefox']) {
      const name = `digimmo-extension-${release.version}-${browser}.zip`;
      await archive(path.join(publicDir, 'extension-' + browser), path.join(output, name));
      names.push(name);
    }
    const script = `digimmo-tweaks-${release.version}.user.js`;
    fs.copyFileSync(path.join(publicDir, 'digimmo-tweaks.user.js'), path.join(output, script));
    names.push(script);
  }
  const sums = names.sort().map(name => {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(output, name))).digest('hex');
    return hash + '  ' + name;
  });
  fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
  console.log(`Prepared ${names.length} files plus SHA256SUMS.txt in ${output}. Nothing uploaded or installed.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
