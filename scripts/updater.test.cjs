'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startUpdates,createController,updateMessage}=require('../client/updater');
function fixture(){
  const app=new EventEmitter(),updater=new EventEmitter(),timers=[],cleared=[],notices=[];
  updater.checkForUpdates=async()=>null;
  const timer=(fn,ms)=>{const handle={fn,ms,unref(){}};timers.push(handle);return handle;};
  const controller=createController({app,updater,notify:v=>notices.push(v),setTimeoutFn:timer,setIntervalFn:timer,clearTimeoutFn:h=>cleared.push(h),clearIntervalFn:h=>cleared.push(h)});
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
  assert.equal(startUpdates({...args,platform:'linux'}).enabled,false);
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
  assert.match(updateMessage('en-US').body,/close the client/);
  assert.match(updateMessage('es').body,/cerrar el cliente/);
  assert.match(updateMessage('pt-BR').body,/fechar o cliente/);
});
