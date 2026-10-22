'use strict';
const fs=require('node:fs');
const path=require('node:path');

// The installer marker keeps development and unpacked copies outside the feed.
function startUpdates({app,development=false,resourcesPath=process.resourcesPath,platform=process.platform,loadUpdater=()=>require('electron-updater').autoUpdater,notify}){
  if(development||platform!=='win32'||!app.isPackaged||!fs.existsSync(path.join(resourcesPath,'digimmo-installed'))||!fs.existsSync(path.join(resourcesPath,'app-update.yml')))return {enabled:false};
  try{return createController({app,updater:loadUpdater(),notify});}
  catch{return {enabled:false};}
}

function createController({app,updater,notify=()=>{},setTimeoutFn=setTimeout,setIntervalFn=setInterval,clearTimeoutFn=clearTimeout,clearIntervalFn=clearInterval}){
  updater.allowPrerelease=false;
  updater.allowDowngrade=false;
  updater.autoDownload=true;
  updater.autoInstallOnAppQuit=true;
  updater.disableWebInstaller=true;
  updater.logger=null;
  let busy=false,stopped=false;
  const announced=new Set();
  const windows=new Set();
  // Missing feeds and interrupted downloads must never prevent the game opening.
  const onError=()=>{};
  const onDownloaded=info=>{
    if(stopped||announced.has(info.version))return;
    announced.add(info.version);
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
  app.on('browser-window-created',watchWindow);
  // Do not compete with initial game loading or force a restart during play.
  const initial=setTimeoutFn(check,20000);
  const interval=setIntervalFn(check,4*60*60*1000);
  initial.unref?.();interval.unref?.();
  const stop=()=>{
    stopped=true;
    clearTimeoutFn(initial);clearIntervalFn(interval);
    app.removeListener('browser-window-created',watchWindow);
    app.removeListener('before-quit',stop);
    for(const window of windows){window.removeListener('query-session-end',suspendInstall);window.removeListener('session-end',suspendInstall);}
    windows.clear();
    updater.removeListener('update-downloaded',onDownloaded);
    // Retain the error listener until process exit: an in-flight download may fail.
  };
  app.once('before-quit',stop);
  return {enabled:true,check,stop};
}

function updateMessage(locale='en'){
  if(locale.startsWith('es'))return {title:'Actualización lista',body:'DigiMMO se actualizará al cerrar el cliente. Puedes seguir jugando.'};
  if(locale.startsWith('pt'))return {title:'Atualização pronta',body:'O DigiMMO será atualizado quando você fechar o cliente. Você pode continuar jogando.'};
  return {title:'Update ready',body:'DigiMMO will update when you close the client. You can keep playing.'};
}

module.exports={startUpdates,createController,updateMessage};
