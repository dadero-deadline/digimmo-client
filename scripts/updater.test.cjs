'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startUpdates,createController,updateMessage}=require('../client/updater');
function fixture(options={}){
  const app=new EventEmitter(),updater=new EventEmitter(),timers=[],cleared=[],notices=[];
  updater.checkForUpdates=async()=>null;
  const timer=(fn,ms)=>{const handle={fn,ms,unref(){}};timers.push(handle);return handle;};
  const controller=createController({app,updater,notify:v=>notices.push(v),setTimeoutFn:timer,setIntervalFn:timer,clearTimeoutFn:h=>cleared.push(h),clearIntervalFn:h=>cleared.push(h),...options});
  return {app,updater,timers,cleared,notices,controller};
}
test('development and unpacked builds never load the updater',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'digimmo-updater-test-'));
  const args={app:{isPackaged:true},resourcesPath:dir,platform:'win32',loadUpdater:()=>{throw Error('Must not load');}};
  assert.equal(startUpdates(args).enabled,false);
  fs.writeFileSync(path.join(dir,'app-update.yml'),'provider: github');
  assert.equal(startUpdates(args).enabled,false);
  fs.writeFileSync(path.join(dir,'digimmo-installed'),'nsis');
  assert.equal(startUpdates({...args,development:true}).enabled,false);
  assert.equal(startUpdates({...args,app:{isPackaged:false}}).enabled,false);
  assert.equal(startUpdates({...args,platform:'linux',env:{}}).enabled,false,'Only an AppImage updates on Linux');
  assert.equal(startUpdates(args).enabled,false,'Broken updater dependency must not prevent app startup');
  for(const name of ['app-update.yml','digimmo-installed'])fs.unlinkSync(path.join(dir,name));
  fs.rmdirSync(dir);
});
test('stable downloads apply on normal exit, with no forced restart',async()=>{
  const f=fixture();let checks=0;
  f.updater.checkForUpdates=async()=>{checks++;return {downloadPromise:Promise.resolve()};};
  assert.equal(f.updater.allowPrerelease,false);assert.equal(f.updater.allowDowngrade,false);
  assert.equal(f.updater.autoDownload,true);assert.equal(f.updater.autoInstallOnAppQuit,true);
  assert.equal(f.updater.disableWebInstaller,true);
  assert.deepEqual(f.timers.map(t=>t.ms),[20000,14400000]);
  await f.controller.check();assert.equal(checks,1);
  f.updater.emit('update-downloaded',{version:'0.2.0'});
  f.updater.emit('update-downloaded',{version:'0.2.0'});
  assert.deepEqual(f.notices,['0.2.0']);f.controller.stop();
});
test('checks do not overlap during a download',async()=>{
  const f=fixture();let finish,calls=0;
  f.updater.checkForUpdates=async()=>{calls++;return {downloadPromise:new Promise(resolve=>{finish=resolve;})};};
  const active=f.controller.check();await Promise.resolve();await f.controller.check();assert.equal(calls,1);
  finish();await active;f.controller.stop();
});
test('network and download failures are contained and can retry',async()=>{
  const f=fixture();let calls=0;
  f.updater.checkForUpdates=async()=>{calls++;throw Error('404 or offline');};
  await f.controller.check();f.updater.emit('error',Error('network'));await f.controller.check();
  assert.equal(calls,2);assert.deepEqual(f.notices,[]);f.controller.stop();
  f.updater.emit('error',Error('late download failure'));
});
test('Windows shutdown suppresses installation',()=>{
  const f=fixture(),window=new EventEmitter();f.app.emit('browser-window-created',{},window);
  window.emit('query-session-end',{});assert.equal(f.updater.autoInstallOnAppQuit,false);f.controller.stop();
});
test('quit releases timers and window listeners',async()=>{
  const f=fixture(),window=new EventEmitter();f.app.emit('browser-window-created',{},window);
  f.app.emit('before-quit');assert.equal(f.cleared.length,2);assert.equal(window.listenerCount('query-session-end'),0);
  f.updater.checkForUpdates=()=>{throw Error('Must not check');};await f.controller.check();
  f.updater.emit('update-downloaded',{version:'0.2.0'});assert.deepEqual(f.notices,[]);
});
test('notification text supports all menu languages',()=>{
  assert.match(updateMessage('en-US','0.1.3').body,/Close the client/);
  assert.match(updateMessage('es','0.1.3').body,/Cierra el cliente/);
  assert.match(updateMessage('pt-BR','0.1.3').body,/Feche o cliente/);
  for(const lang of ['en','es','pt'])assert.match(updateMessage(lang,'0.1.3').title,/DigiMMO 0\.1\.3$/);
  assert.equal(updateMessage('en','unexpected text').title,'Update ready');
});

test('a packaged Linux AppImage updates itself; other Linux runs stay offline',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'digimmo-updater-appimage-'));
  const app=Object.assign(new EventEmitter(),{isPackaged:true});
  const updater=Object.assign(new EventEmitter(),{checkForUpdates:async()=>null});
  const args={app,resourcesPath:dir,platform:'linux',execPath:'/tmp/.mount_DigiMMO/digimmo',loadUpdater:()=>updater,notify:()=>{}};
  try{
    assert.equal(startUpdates({...args,env:{APPIMAGE:'/home/jorge/DigiMMO.AppImage'}}).enabled,false,'No feed without app-update.yml');
    fs.writeFileSync(path.join(dir,'app-update.yml'),'provider: github');
    assert.equal(startUpdates({...args,env:{}}).enabled,false,'Unpacked or system installs do not update');
    assert.equal(startUpdates({...args,env:{APPIMAGE:'DigiMMO.AppImage'}}).enabled,false,'Relative image paths are ignored');
    const result=startUpdates({...args,env:{APPIMAGE:'/home/jorge/DigiMMO.AppImage'}});
    assert.equal(result.enabled,true);
    assert.equal(updater.installDirectory,undefined,'The AppImage updater replaces the image itself');
    assert.equal(updater.autoInstallOnAppQuit,true);
    result.stop();
  }finally{
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('packaged Windows clients update the folder they were started from',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'digimmo-updater-folder-'));
  fs.writeFileSync(path.join(dir,'app-update.yml'),'provider: github');
  fs.writeFileSync(path.join(dir,'digimmo-installed'),'zip');
  const updater=new EventEmitter();
  updater.checkForUpdates=async()=>null;
  const game=path.join(dir,'DigiMMO','DigiMMO.exe');
  const app=Object.assign(new EventEmitter(),{isPackaged:true});
  const result=startUpdates({app,resourcesPath:dir,platform:'win32',execPath:game,loadUpdater:()=>updater,notify:()=>{}});
  try{
    assert.equal(result.enabled,true);
    assert.equal(updater.installDirectory,path.join(dir,'DigiMMO'));
    assert.equal(updater.autoInstallOnAppQuit,true);
  }finally{
    result.stop();
    for(const name of ['app-update.yml','digimmo-installed'])fs.unlinkSync(path.join(dir,name));
    fs.rmdirSync(dir);
  }
});
