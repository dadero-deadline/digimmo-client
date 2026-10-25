'use strict';
const { app, BrowserWindow, shell, Menu, Notification, ipcMain, net } = require('electron');
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
// An AppImage cannot carry Chromium's setuid sandbox helper, and Ubuntu 23.10+ blocks the
// unprivileged namespaces it falls back to. The game window already runs without a renderer sandbox.
const namespacesBlocked = () => {
  try { return fs.readFileSync('/proc/sys/kernel/apparmor_restrict_unprivileged_userns', 'utf8').trim() === '1'; }
  catch { return false; }
};
if (process.platform === 'linux' && process.env.APPIMAGE && namespacesBlocked())
  app.commandLine.appendSwitch('no-sandbox');
// The game needs WebGL. Chromium blocks several Linux drivers (for example WSL and older Mesa),
// which would leave the game on its loading screen instead of rendering.
if (process.platform === 'linux') app.commandLine.appendSwitch('ignore-gpu-blocklist');
const GAME = 'https://play.digimmo.com.br/';
const ALLOWED = new Set(['https://play.digimmo.com.br','https://wiki.digimmo.com.br']);
// Public game endpoints: the launcher reads the online count, the maintenance flag and the patch notes.
const STATUS = 'https://play.digimmo.com.br/api/health';
const PATCH_NOTES = 'https://play.digimmo.com.br/api/patch-notes';
const LANGUAGES = {en:'en',es:'es',pt:'pt-BR'};
const LINKS = {website:'https://digimmo.com.br/',wiki:'https://wiki.digimmo.com.br/',discord:'https://discord.gg/ggCNjs8QVA',
  client:'https://github.com/dadero-deadline/digimmo-client/releases/latest'};
// Public ID of the DigiMMO application in the Discord Developer Portal. Empty disables presence.
const DISCORD_APPLICATION_ID = '1563735337660846163';
const allowed = url => { try { return ALLOWED.has(new URL(url).origin); } catch { return false; } };
const external = url => { try { if (['http:','https:'].includes(new URL(url).protocol)) shell.openExternal(url); } catch {} };
const stateFile = () => path.join(app.getPath('userData'),'fenster.json');
const loadState = () => { try { return JSON.parse(fs.readFileSync(stateFile(),'utf8')); } catch { return {}; } };
// The F10 menu decides whether the start window opens and in which language; the page reports it here.
const launcherFile = () => path.join(app.getPath('userData'),'launcher.json');
const launcherChoice = value => ({show:value?.show!==false,language:Object.hasOwn(LANGUAGES,value?.language)?value.language:null});
const loadLauncher = () => { try { return launcherChoice(JSON.parse(fs.readFileSync(launcherFile(),'utf8'))); } catch { return launcherChoice(); } };
const developmentArguments = [];
  // @development-start
// Development loads its freshly built bundle unless a test file is explicitly selected.
if (process.env.DIGIMMO_DEV_TEST_SCRIPT && path.isAbsolute(process.env.DIGIMMO_DEV_TEST_SCRIPT))
  developmentArguments.push('--digimmo-test-script='+process.env.DIGIMMO_DEV_TEST_SCRIPT);
  // @development-end
let mainWindow;
let launcherWindow;
let pendingUpdate = null;
const open = win => win && !win.isDestroyed();
const sendUpdateNotice = () => {
  if(pendingUpdate && open(mainWindow) &&
      mainWindow.webContents.getURL().startsWith(GAME))
    mainWindow.webContents.send('digimmo:update-ready',pendingUpdate);
  if(pendingUpdate && open(launcherWindow))launcherWindow.webContents.send('launcher:update',pendingUpdate);
};
const windowIcon = () => path.join(__dirname,process.platform==='win32'?'icon.ico':'icon.png');
function createWindow() {
  const st=loadState();
  const win=new BrowserWindow({width:st.width||1280,height:st.height||900,x:st.x,y:st.y,
    minWidth:800,minHeight:600,title:'DigiMMO',icon:windowIcon(),
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
  if(st.maximized)win.maximize();
  win.once('ready-to-show',()=>win.show());
  win.on('page-title-updated',e=>e.preventDefault());
  win.webContents.setWindowOpenHandler(({url})=>{
    if(allowed(url))return {action:'allow',overrideBrowserWindowOptions:{webPreferences:{devTools:DEVELOPMENT}}};
    external(url);return {action:'deny'};
  });
  win.webContents.on('will-navigate',(e,url)=>{if(!allowed(url)){e.preventDefault();external(url);}});
  // Quitting soon after the game's service worker filled its cache can leave that cache inconsistent;
  // the worker then rejects every page load (ERR_FAILED, a black window). Clear only that worker and
  // its caches once and reload. Login, settings and other site data stay.
  let repaired=false;
  win.webContents.on('did-fail-load',(e,code,description,url,mainFrame)=>{
    if(repaired||!mainFrame||code!==-2||!String(url).startsWith(GAME))return;
    repaired=true;
    win.webContents.session.clearStorageData({origin:new URL(GAME).origin,storages:['serviceworkers','cachestorage']})
      .catch(()=>{}).then(()=>{if(!win.isDestroyed())win.loadURL(GAME);});
  });
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
// The start window shows the game's patch notes, the server status and client news before the game loads.
function createLauncher() {
  const win=new BrowserWindow({width:960,height:600,minWidth:720,minHeight:480,title:'DigiMMO',icon:windowIcon(),
    backgroundColor:'#0b1030',autoHideMenuBar:true,show:false,
    webPreferences:{preload:path.join(__dirname,'launcher-preload.js'),contextIsolation:true,sandbox:true,devTools:DEVELOPMENT}});
  launcherWindow=win;
  win.once('ready-to-show',()=>win.show());
  win.on('page-title-updated',e=>e.preventDefault());
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.loadFile(path.join(__dirname,'launcher.html'));
}
const fromLauncher = event => open(launcherWindow) && event.sender===launcherWindow.webContents;
const clientNote = () => { try { return JSON.parse(fs.readFileSync(path.join(__dirname,'launcher-notes.json'),'utf8')); } catch { return null; } };
const getJson = async url => {
  const response=await net.fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json();
};
const isText = value => typeof value==='string';
// Same shape the game's own patch notes window accepts: topics, paragraphs and lists of plain text.
const gameNews = async language => {
  try {
    const locale=LANGUAGES[language]||'en';
    const list=await getJson(PATCH_NOTES);
    const releases=(Array.isArray(list?.releases)?list.releases:[])
      .filter(release=>isText(release?.id)&&/^\d{4}-\d{2}-\d{2}[a-z]?$/.test(release.id)&&isText(release.date)).slice(0,5);
    return await Promise.all(releases.map(async release=>{
      const notes=await getJson(PATCH_NOTES+'/'+encodeURIComponent(release.id)+'?locale='+encodeURIComponent(locale));
      const blocks=(Array.isArray(notes?.blocks)?notes.blocks:[]).flatMap(block=>
        (block?.kind==='topic'||block?.kind==='text')&&isText(block.text)?[{kind:block.kind,text:block.text}]:
        block?.kind==='list'&&Array.isArray(block.items)?[{kind:'list',items:block.items.filter(isText)}]:[]);
      return {date:release.date,ofDay:Number.isInteger(release.ofDay)?release.ofDay:0,blocks};
    }));
  } catch { return null; }
};
const serverStatus = async () => {
  try {
    const response=await net.fetch(STATUS,{cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok)return {reachable:false};
    const health=await response.json();
    const online=Number(health.online ?? health.capacity?.online);
    return {reachable:true,ok:health.ok!==false,online:Number.isFinite(online)?online:null,maintenance:health.drain?.on===true};
  } catch { return {reachable:false}; }
};
ipcMain.handle('launcher:info',event=>fromLauncher(event)?{version:app.getVersion(),locale:app.getLocale(),language:loadLauncher().language,client:clientNote(),update:pendingUpdate}:null);
ipcMain.handle('launcher:news',(event,language)=>fromLauncher(event)?gameNews(language):null);
ipcMain.handle('launcher:status',event=>fromLauncher(event)?serverStatus():null);
ipcMain.on('launcher:open',(event,link)=>{if(fromLauncher(event)&&Object.hasOwn(LINKS,link))external(LINKS[link]);});
ipcMain.on('launcher:play',event=>{
  if(!fromLauncher(event)||open(mainWindow))return;
  const launcher=launcherWindow;
  createWindow();
  // Keep the start window until the game window appears, so there is no empty gap.
  mainWindow.once('show',()=>{if(open(launcher))launcher.close();});
});
ipcMain.on('digimmo:launcher-preferences',(event,value)=>{
  try { if(!open(mainWindow)||event.sender!==mainWindow.webContents||new URL(event.senderFrame.url).origin+'/'!==GAME)return; } catch { return; }
  const next=launcherChoice(value),current=loadLauncher();
  if(next.show!==current.show||next.language!==current.language)try{fs.writeFileSync(launcherFile(),JSON.stringify(next));}catch{}
});
if(!app.requestSingleInstanceLock())app.quit();
else {
  app.on('second-instance',()=>{const win=[mainWindow,launcherWindow].find(open);if(win){if(win.isMinimized())win.restore();win.focus();}});
  app.whenReady().then(()=>{
    if(process.platform==='win32')app.setAppUserModelId(APP_ID);
    startUpdates({app,development:DEVELOPMENT,notify:version=>{
      pendingUpdate=updateMessage(app.getLocale(),version);
      sendUpdateNotice();
      if(Notification.isSupported())new Notification({...pendingUpdate,icon:path.join(__dirname,'icon.png')}).show();
    }});
    const presence=startPresence({applicationId:DISCORD_APPLICATION_ID});
    app.once('will-quit',()=>presence.stop());
    Menu.setApplicationMenu(null);
    if(loadLauncher().show)createLauncher();
    else createWindow();
  });
}
app.on('window-all-closed',()=>app.quit());
