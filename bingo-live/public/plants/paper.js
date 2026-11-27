import {generator} from './parts.js';

import {journal} from '../styles/tokens.js';
export const bookPaper = journal.sheet;
const radians = angle => angle * Math.PI / 180;
const stampDate = new Intl.DateTimeFormat('ru-RU', {day:'numeric', month:'short', year:'numeric'});

// Draw in the specimen's 250 × 310 coordinates so the page and postcard
// share the location of each fibre, crease and date label.
export function drawPaper(ctx, plant) {
  const random = generator(JSON.stringify([plant.speciesId, plant.seed, 'paper']));
  ctx.save();
  ctx.scale(ctx.canvas.width / 250, ctx.canvas.height / 310);
  ctx.fillStyle = bookPaper;
  ctx.fillRect(0,0,250,310);
  const shadow = ctx.createLinearGradient(0,0,17,0);
  shadow.addColorStop(0,'rgba(166,143,108,.14)');
  shadow.addColorStop(1,'rgba(166,143,108,0)');
  ctx.fillStyle = shadow;
  ctx.fillRect(0,0,17,310);
  ctx.lineWidth = .4;
  ctx.lineCap = 'round';
  for (let i=0; i<270; i++) {
    const x=random()*250, y=random()*310, length=1+random()*3;
    const margin=Math.min(x,250-x,y,310-y)<23;
    ctx.strokeStyle = i % 3 ? 'rgba(126,108,78,'+(margin ? .16 : .055)+')' : 'rgba(255,255,255,.52)';
    ctx.beginPath(); ctx.moveTo(x,y);
    ctx.quadraticCurveTo(x+length*.5,y-.45,x+length,y+(random()-.5)*1.5);
    ctx.stroke();
  }
  if (random()<.4) {
    const x=220+random()*18, y=12+random()*13;
    ctx.beginPath(); ctx.moveTo(x,0); ctx.quadraticCurveTo(x+8,y*.6,250,y);
    ctx.strokeStyle='rgba(136,116,82,.22)'; ctx.stroke();
  }
  if (plant.pressedAt) {
    const date=stampDate.format(new Date(plant.pressedAt));
    ctx.translate(200,292); ctx.rotate(radians((random()-.5)*6));
    ctx.font='9px Georgia'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const width=ctx.measureText(date).width+14;
    ctx.fillStyle='#f7f3e8'; ctx.fillRect(-width/2,-8,width,16);
    ctx.strokeStyle='rgba(119,103,77,.53)'; ctx.lineWidth=.55;
    ctx.strokeRect(-width/2,-8,width,16);
    ctx.fillStyle=journal.caption; ctx.fillText(date,0,.4);
  }
  ctx.restore();
}

// The stem and silhouette masks are unrotated, in the same fixed coordinates.
export function placeTapes(model, stem, silhouette, seed) {
  const random = generator(JSON.stringify([model.stem.file,seed,'tape-edge']));
  const alpha = (mask,x,y) => mask[(Math.round(y)*250+Math.round(x))*4+3] || 0;
  const placements=[];
  for (const strip of model.tapes) {
    let best, score=Infinity;
    const angle=radians(strip.angle), dx=Math.cos(angle), dy=Math.sin(angle);
    const first=Math.max(6,Math.ceil(model.y+model.stemH*.38));
    const last=Math.min(300,Math.floor(model.y+model.stemH*.94));
    for (let y=first; y<=last; y++) {
      if (placements.some(tape=>Math.abs(tape.y-y)<22)) continue;
      for (let x=Math.max(24,Math.floor(model.x)); x<Math.min(226,model.x+model.stemW); x++) {
        const opacity=alpha(stem,x,y);
        if (opacity<100) continue;
        const distance=Math.hypot(strip.x-x,strip.y-y)+(255-opacity)/48;
        if (distance>=score) continue;
        const endsClear=[-1,1].every(side=>[-3,0,3].every(offset=>{
          const reach=side*(strip.width/2-1.6);
          return alpha(silhouette,x+reach*dx-offset*dy,y+reach*dy+offset*dx)<20;
        }));
        if (endsClear) { score=distance; best={...strip,x,y}; }
      }
    }
    if (best) placements.push({...best, opacity:.48+random()*.18,
      nicks:Array.from({length:6},()=>.5+random()*1.7), fold:1.6+random()*1.6});
  }
  return placements;
}

export function drawMounts(ctx, transform, strips, opacity) {
  if (!opacity) return;
  ctx.save(); ctx.setTransform(transform);
  for (const strip of strips) {
    ctx.save(); ctx.translate(strip.x,strip.y); ctx.rotate(radians(strip.angle));
    const w=strip.width/2, n=strip.nicks;
    ctx.globalAlpha=opacity; ctx.beginPath();
    ctx.moveTo(-w,-3.7); ctx.lineTo(w,-4.2); ctx.lineTo(w-n[0],-2.7);
    ctx.lineTo(w-.3,-1.2); ctx.lineTo(w-n[1],.2); ctx.lineTo(w-.2,1.9);
    ctx.lineTo(w-n[2],4); ctx.lineTo(-w+.4,3.8); ctx.lineTo(-w+n[3],2);
    ctx.lineTo(-w+.1,.9); ctx.lineTo(-w+n[4],-.7); ctx.lineTo(-w+n[5],-2.2); ctx.closePath();
    ctx.shadowColor='rgba(74,54,30,.20)'; ctx.shadowBlur=.55; ctx.shadowOffsetY=.55;
    ctx.fillStyle='rgba(219,192,132,'+strip.opacity+')'; ctx.fill();
    ctx.shadowColor='transparent'; ctx.strokeStyle='rgba(127,101,63,.37)'; ctx.lineWidth=.45; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w-strip.fold,-4); ctx.lineTo(w,-4.2); ctx.lineTo(w-n[0],-2.7);
    ctx.closePath(); ctx.fillStyle='rgba(255,249,224,.78)'; ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
