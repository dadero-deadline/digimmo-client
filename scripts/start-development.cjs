'use strict';
// Use the normal Windows packager for OS identity; never modify node_modules Electron.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),output=path.join(root,'dist/development/windows');
const exe=path.join(output,'win-unpacked/DigiMMO.exe');
async function main(){
  if(process.platform!=='win32')throw new Error('The development client currently targets Windows.');
  const config=JSON.parse(fs.readFileSync(path.join(root,'electron-builder.json'),'utf8'));
  config.appId='com.dadero.digimmo.dev';
  config.directories={output};
  config.asar=false;
  config.files=config.files.map(file=>typeof file==='string'?file:{...file,from:'dist/development/client'});
  config.extraResources=[];config.extraFiles=[];config.publish=null;
  const stamp=crypto.createHash('sha256').update(JSON.stringify(config))
    .update(require('../package.json').version)
    .update(fs.readFileSync(path.join(root,'package-lock.json')))
    .update(require('electron/package.json').version).update(require('electron-builder/package.json').version)
    .update(fs.readFileSync(path.join(root,'client/icon.ico'))).digest('hex');
  const stampFile=path.join(output,'runtime.sha256');
  if(!fs.existsSync(exe)||!fs.existsSync(stampFile)||fs.readFileSync(stampFile,'utf8')!==stamp){
    const {build,Platform,Arch}=require('electron-builder');
    // An explicit file prevents builder from merging public file patterns into this target.
    const configFile=path.join(root,'dist/development/windows-config.json');
    fs.writeFileSync(configFile,JSON.stringify(config,null,2));
    await build({projectDir:root,targets:Platform.WINDOWS.createTarget(['dir'],Arch.x64),config:configFile,publish:'never'});
    const main=fs.readFileSync(path.join(output,'win-unpacked/resources/app/main.js'),'utf8');
    if(!main.includes('const DEVELOPMENT = true;'))throw new Error('Expected the development application.');
    fs.writeFileSync(stampFile,stamp);
  }
  if(process.argv.includes('--prepare-only'))return;
  const child=spawn(exe,[],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});
  child.once('error',error=>{console.error(error.message);process.exitCode=1;});
  child.unref();
}
main().catch(error=>{console.error(error);process.exitCode=1;});
