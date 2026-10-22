'use strict';
// The public client always loads its reviewed bundled build. Development may
// select a local test file or the user's manually installed override. Updates are
// handled by the main process and never fetch scripts from this preload.
const fs=require('node:fs');
const path=require('node:path');
const read=file=>{try{return fs.readFileSync(file,'utf8');}catch{return null;}};
let code=read(path.join(__dirname,'tweaks.user.js'));
  // @development-start
const arg=process.argv.find(a=>a.startsWith('--digimmo-userdata='));
const testArg=process.argv.find(a=>a.startsWith('--digimmo-test-script='));
if(testArg)code=read(testArg.slice('--digimmo-test-script='.length))||code;
else if(arg)code=read(path.join(arg.slice('--digimmo-userdata='.length),'tweaks.user.js'))||code;
  // @development-end
if(code&&location.origin==='https://play.digimmo.com.br'&&process.isMainFrame){
  const inject=()=>{const script=document.createElement('script');script.textContent=code+'\n//# sourceURL=digimmo-tweaks.user.js';(document.head||document.documentElement).appendChild(script);script.remove();};
  if(document.documentElement)inject();
  else new MutationObserver((_,observer)=>{if(document.documentElement){observer.disconnect();inject();}}).observe(document,{childList:true});
}
