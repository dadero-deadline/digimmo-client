'use strict';
// The public client always loads its reviewed bundled build. Development may
// explicitly select a local test file. Updates are
// handled by the main process and never fetch scripts from this preload.
const fs=require('node:fs');
const path=require('node:path');
const {ipcRenderer}=require('electron');
// Receive status only. The page gets no Node, IPC or update-installation API.
if(location.origin==='https://play.digimmo.com.br'&&process.isMainFrame){
  let notice=null,host=null;
  const renderNotice=()=>{
    if(!notice||!document.body)return;
    if(!host){
      host=document.createElement('div');host.id='digimmo-client-update';
      host.style.cssText='all:initial;position:fixed;bottom:12px;right:12px;z-index:2147483647;max-width:calc(100vw - 24px);width:340px;pointer-events:none';
      const shadow=host.attachShadow({mode:'closed'});
      const style=document.createElement('style');
      style.textContent='aside{box-sizing:border-box;padding:10px 14px;border:1px solid #667aa4;border-radius:8px;background:#121d32;color:#edf3ff;font:13px/1.45 system-ui,sans-serif;box-shadow:0 3px 14px #0005}strong{display:block;font-weight:600;margin-bottom:2px}p{margin:0;color:#c8d5ed}';
      const box=document.createElement('aside');box.setAttribute('role','status');box.setAttribute('aria-live','polite');
      const title=document.createElement('strong'),body=document.createElement('p');box.append(title,body);shadow.append(style,box);
      host.updateText=value=>{title.textContent=value.title;body.textContent=value.body;};
      document.body.appendChild(host);
    }
    host.updateText(notice);
  };
  const receiveNotice=(_,value)=>{
    if(!value||typeof value.title!=='string'||typeof value.body!=='string')return;
    notice=value;renderNotice();
  };
  ipcRenderer.on('digimmo:update-ready',receiveNotice);
  document.addEventListener('DOMContentLoaded',renderNotice,{once:true});
  window.addEventListener('pagehide',()=>ipcRenderer.removeListener('digimmo:update-ready',receiveNotice),{once:true});
}
const read=file=>{try{return fs.readFileSync(file,'utf8');}catch{return null;}};
let code=read(path.join(__dirname,'tweaks.user.js'));
  // @development-start
const testArg=process.argv.find(a=>a.startsWith('--digimmo-test-script='));
if(testArg)code=read(testArg.slice('--digimmo-test-script='.length))||code;
  // @development-end
if(code&&location.origin==='https://play.digimmo.com.br'&&process.isMainFrame){
  const inject=()=>{const script=document.createElement('script');script.textContent=code+'\n//# sourceURL=digimmo-tweaks.user.js';(document.head||document.documentElement).appendChild(script);script.remove();};
  if(document.documentElement)inject();
  else new MutationObserver((_,observer)=>{if(document.documentElement){observer.disconnect();inject();}}).observe(document,{childList:true});
}
