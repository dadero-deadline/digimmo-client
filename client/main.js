'use strict';
const { app, BrowserWindow, shell, Menu, Notification } = require('electron');
const { startUpdates, updateMessage } = require('./updater');
const { startPresence } = require('./discord');
const path = require('node:path');
const fs = require('node:fs');
const DEVELOPMENT = __DEVELOPMENT__;
const APP_ID = DEVELOPMENT ? 'com.dadero.digimmo.dev' : 'com.dadero.digimmo';
// Keep existing logins and settings when changing the displayed product name.
if (!app.commandLine.hasSwitch('user-data-dir'))
  app.setPath('userData', path.join(app.getPath('appData'), 'Digi MMO'));
app.setName('DigiMMO');
const GAME = 'https://play.digimmo.com.br/';
const ALLOWED = new Set(['https://play.digimmo.com.br','https://wiki.digimmo.com.br']);
// Public ID of the DigiMMO application in the Discord Developer Portal. Empty disables presence.
const DISCORD_APPLICATION_ID = '';
const allowed = url => { try { return ALLOWED.has(new URL(url).origin); } catch { return false; } };
const external = url => { try { if (['http:','https:'].includes(new URL(url).protocol)) shell.openExternal(url); } catch {} };
const stateFile = () => path.join(app.getPath('userData'),'fenster.json');
const loadState = () => { try { return JSON.parse(fs.readFileSync(stateFile(),'utf8')); } catch { return {}; } };
const developmentArguments = [];
  // @development-start
// Development loads its freshly built bundle unless a test file is explicitly selected.
if (process.env.DIGIMMO_DEV_TEST_SCRIPT && path.isAbsolute(process.env.DIGIMMO_DEV_TEST_SCRIPT))
  developmentArguments.push('--digimmo-test-script='+process.env.DIGIMMO_DEV_TEST_SCRIPT);
  // @development-end
let mainWindow;
let pendingUpdate = null;
const sendUpdateNotice = () => {
  if(pendingUpdate && mainWindow && !mainWindow.isDestroyed() &&
      mainWindow.webContents.getURL().startsWith(GAME))
    mainWindow.webContents.send('digimmo:update-ready',pendingUpdate);
};
function createWindow() {
  const st=loadState();
  const win=new BrowserWindow({width:st.width||1280,height:st.height||900,x:st.x,y:st.y,
    minWidth:800,minHeight:600,title:'DigiMMO',icon:path.join(__dirname,process.platform==='win32'?'icon.ico':'icon.png'),
    backgroundColor:'#0b1030',autoHideMenuBar:true,show:false,
    webPreferences:{preload:path.join(__dirname,'preload.js'),partition:'persist:digimmo',
      contextIsolation:true,sandbox:false,backgroundThrottling:false,devTools:DEVELOPMENT,
      additionalArguments:developmentArguments}});
  mainWindow=win;
  win.webContents.on('dom-ready',sendUpdateNotice);
  if(process.platform==='win32')win.setAppDetails({appId:APP_ID,
    appIconPath:app.isPackaged?process.execPath:path.join(__dirname,'icon.ico'),appIconIndex:0,
    relaunchCommand:'"'+process.execPath+'"'+(app.isPackaged?'':' "'+app.getAppPath()+'"'),
    relaunchDisplayName:'DigiMMO'});
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
    if(process.platform==='win32')app.setAppUserModelId(APP_ID);
    startUpdates({app,development:DEVELOPMENT,notify:version=>{
      pendingUpdate=updateMessage(app.getLocale(),version);
      sendUpdateNotice();
      if(Notification.isSupported())new Notification({...pendingUpdate,icon:path.join(__dirname,'icon.png')}).show();
    }});
    const presence=startPresence({applicationId:DISCORD_APPLICATION_ID});
    app.once('will-quit',()=>presence.stop());
    createWindow();
  });
}
app.on('window-all-closed',()=>app.quit());
