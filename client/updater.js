'use strict';
const fs=require('node:fs');
const path=require('node:path');

// Packaged Windows copies update in place; a Linux AppImage replaces its own file on exit.
// Development, unpackaged and other Linux runs never join the public feed.
function startUpdates({app,development=false,resourcesPath=process.resourcesPath,platform=process.platform,execPath=process.execPath,env=process.env,loadUpdater=()=>require('electron-updater').autoUpdater,notify,onState,initialDelay}){
  if(development||!app.isPackaged)return {enabled:false};
  if(!fs.existsSync(path.join(resourcesPath,'app-update.yml')))return {enabled:false};
  const windows=platform==='win32'&&fs.existsSync(path.join(resourcesPath,'digimmo-installed'));
  const appImage=platform==='linux'&&typeof env.APPIMAGE==='string'&&path.isAbsolute(env.APPIMAGE);
  if(!windows&&!appImage)return {enabled:false};
  try{
    const updater=loadUpdater();
    if(windows&&typeof execPath==='string'&&path.isAbsolute(execPath))updater.installDirectory=path.dirname(execPath);
    return createController({app,updater,notify,onState,initialDelay});
  }
  catch{return {enabled:false};}
}

function createController({app,updater,notify=()=>{},onState=()=>{},initialDelay=20000,setTimeoutFn=setTimeout,setIntervalFn=setInterval,clearTimeoutFn=clearTimeout,clearIntervalFn=clearInterval}){
  updater.allowPrerelease=false;
  updater.allowDowngrade=false;
  updater.autoDownload=true;
  updater.autoInstallOnAppQuit=true;
  updater.disableWebInstaller=true;
  updater.logger=null;
  let busy=false,stopped=false,state={state:'idle'};
  const announced=new Set();
  const windows=new Set();
  // The start window shows these states; a finished download is never replaced by a later check.
  const report=next=>{if(stopped)return;state=next;try{onState({...state});}catch{}};
  const onChecking=()=>{if(!['ready','downloading'].includes(state.state))report({state:'checking'});};
  const onAvailable=info=>{if(state.state!=='ready')report({state:'downloading',version:info?.version,percent:0});};
  const onCurrent=()=>{if(state.state!=='ready')report({state:'current'});};
  const onProgress=progress=>{if(state.state==='downloading')report({...state,percent:Math.max(0,Math.min(100,Number(progress?.percent)||0))});};
  // Missing feeds and interrupted downloads must never prevent the game opening.
  const onError=()=>{if(state.state!=='ready')report({state:'error'});};
  const onDownloaded=info=>{
    if(stopped||announced.has(info.version))return;
    announced.add(info.version);
    report({state:'ready',version:info.version});
    try{notify(info.version);}catch{}
  };
  const suspendInstall=()=>{updater.autoInstallOnAppQuit=false;};
  const watchWindow=(_,window)=>{
    windows.add(window);
    window.on('query-session-end',suspendInstall);
    window.on('session-end',suspendInstall);
    window.once('closed',()=>windows.delete(window));
  };
  const check=async()=>{
    if(stopped||busy)return;
    busy=true;
    try{
      const result=await updater.checkForUpdates();
      if(result?.downloadPromise)await result.downloadPromise;
    }catch{}finally{busy=false;}
  };
  updater.on('error',onError);
  updater.on('update-downloaded',onDownloaded);
  for(const [name,listener] of [['checking-for-update',onChecking],['update-available',onAvailable],['update-not-available',onCurrent],['download-progress',onProgress]])updater.on(name,listener);
  app.on('browser-window-created',watchWindow);
  // Without the start window, do not compete with initial game loading; never force a restart during play.
  const initial=setTimeoutFn(check,initialDelay);
  const interval=setIntervalFn(check,4*60*60*1000);
  initial.unref?.();interval.unref?.();
  // Only from the start window, before playing: install silently and open the new version.
  const install=()=>{
    if(stopped||state.state!=='ready')return false;
    try{updater.quitAndInstall(true,true);return true;}catch{return false;}
  };
  const stop=()=>{
    stopped=true;
    clearTimeoutFn(initial);clearIntervalFn(interval);
    app.removeListener('browser-window-created',watchWindow);
    app.removeListener('before-quit',stop);
    for(const window of windows){window.removeListener('query-session-end',suspendInstall);window.removeListener('session-end',suspendInstall);}
    windows.clear();
    updater.removeListener('update-downloaded',onDownloaded);
    for(const [name,listener] of [['checking-for-update',onChecking],['update-available',onAvailable],['update-not-available',onCurrent],['download-progress',onProgress]])updater.removeListener(name,listener);
    // Retain the error listener until process exit: an in-flight download may fail.
  };
  app.once('before-quit',stop);
  return {enabled:true,check,install,stop};
}

function updateMessage(locale='en',version=''){
  const suffix=/^\d+\.\d+\.\d+$/.test(version)?' · DigiMMO '+version:'';
  if(locale.startsWith('es'))return {title:'Actualización lista'+suffix,body:'Cierra el cliente para instalarla. Espera a que termine y vuelve a abrir DigiMMO. Puedes seguir jugando por ahora.'};
  if(locale.startsWith('pt'))return {title:'Atualização pronta'+suffix,body:'Feche o cliente para instalar. Espere terminar e abra o DigiMMO novamente. Você pode continuar jogando por enquanto.'};
  return {title:'Update ready'+suffix,body:'Close the client to install. Let it finish, then reopen DigiMMO. You can keep playing for now.'};
}

module.exports={startUpdates,createController,updateMessage};
