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

async function archive(folder, destination) {
  const entries = files(folder);
  const zip = new ZipFile();
  zip.on('error', error => zip.outputStream.destroy(error));
  const temporary = destination + '.tmp';
  const writing = pipeline(zip.outputStream, fs.createWriteStream(temporary));
  try {
    for (const relative of entries) zip.addFile(path.join(folder, relative), relative);
    zip.end();
    await writing;
    fs.renameSync(temporary, destination);
  } catch (error) {
    zip.outputStream.destroy(error);
    await writing.catch(() => {});
    throw error;
  }
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const names = [];
  for (const browser of ['chromium', 'firefox']) {
    const name = `digimmo-extension-${release.version}-${browser}.zip`;
    await archive(path.join(publicDir, 'extension-' + browser), path.join(output, name));
    names.push(name);
  }
  const script = `digimmo-tweaks-${release.version}.user.js`;
  fs.copyFileSync(path.join(publicDir, 'digimmo-tweaks.user.js'), path.join(output, script));
  names.push(script);
  if (installer) {
    const setup = `DigiMMO-Setup-${release.version}-x64.exe`;
    for (const name of [setup, setup + '.blockmap', 'latest.yml']) {
      fs.copyFileSync(path.join(root, 'dist/installer', name), path.join(output, name));
      names.push(name);
    }
  }
  const sums = names.sort().map(name => {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(output, name))).digest('hex');
    return hash + '  ' + name;
  });
  fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
  console.log(`Prepared ${names.length} files plus SHA256SUMS.txt in ${output}. Nothing uploaded or installed.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
