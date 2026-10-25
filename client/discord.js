'use strict';
const net=require('node:net');
const path=require('node:path');

// Shows "Playing DigiMMO" through the local Discord desktop client. Only the
// session start and the public client icon are sent; nothing is read from the game page.
const ICON='https://raw.githubusercontent.com/dadero-deadline/digimmo-client/v0.1.4/client/icon.png';
// Linux: the native client first, then the Flatpak and Snap packages of Discord.
const pipePaths=(platform=process.platform,env=process.env)=>{
  if(platform==='win32')return Array.from({length:10},(_,i)=>'\\\\?\\pipe\\discord-ipc-'+i);
  const base=env.XDG_RUNTIME_DIR||env.TMPDIR||env.TMP||env.TEMP||'/tmp';
  return ['','app/com.discordapp.Discord','snap.discord'].flatMap(dir=>
    Array.from({length:10},(_,i)=>path.join(base,dir,'discord-ipc-'+i)));
};
const frame=(op,data)=>{
  const body=Buffer.from(JSON.stringify(data)),head=Buffer.alloc(8);
  head.writeUInt32LE(op,0);head.writeUInt32LE(body.length,4);
  return Buffer.concat([head,body]);
};

function startPresence({applicationId,pid=process.pid,paths=pipePaths(),connect=net.createConnection,
    retryMs=60000,now=Date.now,setTimeoutFn=setTimeout,clearTimeoutFn=clearTimeout}){
  if(!/^\d{17,20}$/.test(String(applicationId||'')))return {enabled:false,stop(){}};
  const activity={timestamps:{start:Math.floor(now()/1000)},assets:{large_image:ICON,large_text:'DigiMMO'}};
  let current=null,timer=null,stopped=false,nonce=0;
  const retry=()=>{
    if(stopped||timer)return;
    timer=setTimeoutFn(()=>{timer=null;attempt(0);},retryMs);timer.unref?.();
  };
  // Discord may be absent, closed or restarted. Failures only schedule a quiet retry.
  const attempt=index=>{
    if(stopped)return;
    if(index>=paths.length)return retry();
    let connected=false,data=Buffer.alloc(0);
    const pipe=current=connect(paths[index]);
    pipe.on('error',()=>{});
    pipe.once('connect',()=>{connected=true;pipe.write(frame(0,{v:1,client_id:applicationId}));});
    pipe.on('data',chunk=>{
      data=Buffer.concat([data,chunk]);
      while(data.length>=8){
        const op=data.readUInt32LE(0),size=data.readUInt32LE(4);
        if(size>65536)return pipe.destroy();
        if(data.length<8+size)break;
        let message=null;
        try{message=JSON.parse(data.toString('utf8',8,8+size));}catch{}
        data=data.subarray(8+size);
        if(op===1&&message?.evt==='READY')pipe.write(frame(1,{cmd:'SET_ACTIVITY',args:{pid,activity},nonce:String(++nonce)}));
        else if(op===3)pipe.write(frame(4,message));
        else if(op===2)pipe.destroy();
      }
    });
    pipe.once('close',()=>{
      if(current===pipe)current=null;
      if(connected)retry();else attempt(index+1);
    });
  };
  attempt(0);
  return {enabled:true,stop(){
    stopped=true;clearTimeoutFn(timer);timer=null;
    current?.destroy();current=null;
  }};
}

module.exports={startPresence,pipePaths,frame};
