'use strict';
// Format and size conversion only; the supplied artwork is kept unchanged.
const fs=require('node:fs'),path=require('node:path'),{PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),original=path.join(root,'assets/branding/icon-digimmo.png');
const bytes=fs.readFileSync(original),source=PNG.sync.read(bytes);
if(source.width!==source.height)throw new Error('Expected square source artwork');
function resize(size){
  const target=new PNG({width:size,height:size});
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const sx=Math.min(source.width-1,Math.floor((x+.5)*source.width/size));
    const sy=Math.min(source.height-1,Math.floor((y+.5)*source.height/size));
    source.data.copy(target.data,(y*size+x)*4,(sy*source.width+sx)*4,(sy*source.width+sx)*4+4);
  }
  return PNG.sync.write(target);
}
fs.copyFileSync(original,path.join(root,'client/icon.png'));
for(const size of [16,32,48,128])fs.writeFileSync(path.join(root,`extension/icons/icon${size}.png`),resize(size));
const sizes=[16,24,32,48,64,128,192,256],frames=sizes.map(resize);
const header=Buffer.alloc(6+sizes.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
for(let i=0;i<sizes.length;i++){
  const p=6+i*16;header[p]=sizes[i]===256?0:sizes[i];header[p+1]=header[p];
  header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(frames[i].length,p+8);header.writeUInt32LE(offset,p+12);offset+=frames[i].length;
}
fs.writeFileSync(path.join(root,'client/icon.ico'),Buffer.concat([header,...frames]));
console.log(`Prepared official icon: unchanged ${source.width}px source, 4 browser sizes and 8 Windows sizes.`);
