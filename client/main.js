'use strict';
const { app, BrowserWindow, shell, Menu, Notification } = require('electron');
const { startUpdates, updateMessage } = require('./updater');
const path = require('node:path');
const fs = require('node:fs');
const DEVELOPMENT = __DEVELOPMENT__;
// Keep existing logins and settings when changing the displayed product name.
if (!app.commandLine.hasSwitch('user-data-dir'))
  app.setPath('userData', path.join(app.getPath('appData'), 'Digi MMO'));
const GAME = 'https://play.digimmo.com.br/';
const ALLOWED = new Set(['https://play.digimmo.com.br','https://wiki.digimmo.com.br']);
const allowed = url => { try { return ALLOWED.has(new URL(url).origin); } catch { return false; } };
const external = url => { try { if (['http:','https:'].includes(new URL(url).protocol)) shell.openExternal(url); } catch {} };
const stateFile = () => path.join(app.getPath('userData'),'fenster.json');
const loadState = () => { try { return JSON.parse(fs.readFileSync(stateFile(),'utf8')); } catch { return {}; } };
const developmentArguments = [];
  // @development-start
developmentArguments.push('--digimmo-userdata='+app.getPath('userData'));
try {
  const local = JSON.parse(fs.readFileSync(path.join(__dirname,'development.json'),'utf8'));
  if(typeof local.testScript==='string'&&path.isAbsolute(local.testScript))
    developmentArguments.push('--digimmo-test-script='+local.testScript);
} catch {}
  // @development-end
let mainWindow;
function createWindow() {
  const st=loadState();
  const win=new BrowserWindow({width:st.width||1280,height:st.height||900,x:st.x,y:st.y,
    minWidth:800,minHeight:600,title:'DigiMMO',icon:path.join(__dirname,'icon.png'),
    backgroundColor:'#0b1030',autoHideMenuBar:true,show:false,
    webPreferences:{preload:path.join(__dirname,'preload.js'),partition:'persist:digimmo',
      contextIsolation:true,sandbox:false,backgroundThrottling:false,devTools:DEVELOPMENT,
      additionalArguments:developmentArguments}});
  mainWindow=win;
  Menu.setApplicationMenu(null);
  if(st.maximized)win.maximize();
  win.once('ready-to-show',()=>win.show());
  win.on('page-title-updated',e=>e.preventDefault());
  win.webContents.setWindowOpenHandler(({url})=>{
    if(allowed(url))return {action:'allow',overrideBrowserWindowOptions:{webPreferences:{devTools:DEVELOPMENT}}};
    external(url);return {action:'deny'};
  });
  win.webContents.on('will-navigate',(e,url)=>{if(!allowed(url)){e.preventDefault();external(url);}});
  win.webContents.on('before-input-event',(e,input)=>{
    if(input.type!=='keyDown')return;
    const key=(input.key||'').toLowerCase();
    if(key==='f11'){win.setFullScreen(!win.isFullScreen());e.preventDefault();}
    else if(input.control&&!input.shift&&!input.alt&&key==='r'){win.webContents.reload();e.preventDefault();}
  // @development-start
    else if(input.control&&input.shift&&key==='i'){win.webContents.toggleDevTools();e.preventDefault();}
  // @development-end
  });
  win.on('close', () => {
    try {
      const maximized = win.isMaximized();
      const bounds = maximized ? loadState() : win.getBounds();
      fs.writeFileSync(stateFile(), JSON.stringify({ ...bounds, maximized }));
    } catch {}
  });
  win.loadURL(GAME);
}
if(!app.requestSingleInstanceLock())app.quit();
else {
  app.on('second-instance',()=>{if(mainWindow&&!mainWindow.isDestroyed()){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus();}});
  app.whenReady().then(()=>{
    if(process.platform==='win32')app.setAppUserModelId('com.dadero.digimmo');
    startUpdates({app,development:DEVELOPMENT,notify:()=>{
      if(Notification.isSupported())new Notification(updateMessage(app.getLocale())).show();
    }});
    createWindow();
  });
}
app.on('window-all-closed',()=>app.quit());
