import {species} from './bloom-garden.js';
import {sideStems} from './bloom-growth.js';
import {specimenParts} from './bloom-parts.js';
export {seedCode,seedHash,composition} from './bloom-parts.js';

const radians=degrees=>degrees*Math.PI/180;
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export async function drawSpecimen(target,plant){
  const {m,painted,layers,pressed}=await specimenParts(plant);
  const sheet=canvas(target.width,target.height),c=sheet.getContext('2d',{willReadFrequently:true});
  c.scale(sheet.width/250,sheet.height/310);
  c.translate(125,155);c.rotate(radians(m.tilt+(pressed?m.pressAngle:0)));c.translate(-125,-155);
  function paint(l,index){
    c.save();c.translate(l.x,l.y);c.rotate(radians(l.angle));c.scale(l.flip,1);
    const w=l.height*l.part.width/l.part.height;
    c.drawImage(painted[index+1],-w*l.part.anchorX,-l.height*l.part.anchorY,w,l.height);c.restore();
  }
  c.drawImage(painted[0],m.x,m.y,m.stemW,m.stemH);
  for(const f of sideStems(m)){
    c.beginPath();c.moveTo(f.base.x,f.base.y+1);c.quadraticCurveTo(f.x,f.base.y-5,f.x,f.y-1);
    c.strokeStyle=pressed?'#927248':'#627f40';c.lineWidth=1.6;c.lineCap='round';c.stroke();
  }
  layers.forEach(paint);
  const out=target.getContext('2d',{willReadFrequently:true});out.clearRect(0,0,target.width,target.height);out.save();
  out.filter='hue-rotate('+m.hue+'deg) brightness('+m.light+') '+(pressed?'contrast(.98)':'drop-shadow(0px 3px 3px rgba(60,56,35,.18))');
  out.globalAlpha=pressed ? .92 : 1;out.drawImage(sheet,0,0);out.restore();
  if(!pressed)return;
  out.save();out.setTransform(c.getTransform());
  for(const strip of m.tapes){
    out.save();out.translate(strip.x,strip.y);out.rotate(radians(strip.angle));
    const w=strip.width/2;out.beginPath();out.moveTo(-w,-4);out.lineTo(w,-4.6);out.lineTo(w-1,4.2);out.lineTo(-w+1,4.6);out.closePath();
    out.fillStyle='rgba(225,201,146,.66)';out.fill();out.strokeStyle='rgba(146,122,75,.36)';out.lineWidth=.6;out.stroke();out.restore();
  }
  out.restore();
}
export async function postcard(plant,number){
  const card=canvas(900,1200),c=card.getContext('2d'),sp=species[plant.speciesId];
  const rows=[];
  function label(text,font,step){
    c.font=font;
    for(const paragraph of String(text).split('\n')){
      let line='';
      for(const word of paragraph.split(/\s+/)){
        const candidate=line?line+' '+word:word;
        if(!line||c.measureText(candidate).width<=775)line=candidate;
        else{rows.push({line,font,step});line=word;}
        while(c.measureText(line).width>775){
          let end=1;
          while(end<line.length&&c.measureText(line.slice(0,end+1)).width<=775)end++;
          rows.push({line:line.slice(0,end),font,step});line=line.slice(end);
        }
      }
      rows.push({line,font,step});
    }
  }
  const date=s=>new Date(s).toLocaleDateString('ru-RU');
  label(plant.sourceBoardTitle+' · '+plant.sourceLine,'23px Segoe UI',35);
  label('Сбор '+date(plant.collectedAt)+'   ·   Сушка '+date(plant.pressedAt),'23px Segoe UI',35);
  label('Paint seed '+plant.seed,'19px monospace',32);
  if(plant.note)label(plant.note,'italic 24px Georgia',33);
  card.height=Math.max(1200,1032+rows.reduce((h,r)=>h+r.step,0));
  c.fillStyle='#f7f0dd';c.fillRect(0,0,900,card.height);c.strokeStyle='#b8ad89';c.strokeRect(32,32,836,card.height-64);
  c.fillStyle='#444b36';c.font='italic 31px Georgia';c.fillText('Bingo Bloom · Гербарий',62,95);
  c.textAlign='right';c.font='23px Georgia';c.fillText('№ '+String(number).padStart(3,'0'),837,95);c.textAlign='left';
  const art=canvas(650,806);await drawSpecimen(art,plant);c.drawImage(art,125,94);
  c.fillStyle='#303c2d';c.font='54px Georgia';c.fillText(sp.name,62,913);c.font='italic 28px Georgia';c.fillText(sp.latin,62,950);
  let y=990;
  for(const row of rows){c.font=row.font;c.fillText(row.line,62,y);y+=row.step;}
  return new Promise((resolve,reject)=>card.toBlob(blob=>blob?resolve(blob):reject(Error('PNG')),'image/png'));
}

