import {journal} from '../styles/tokens.js';
import {sourceTitle, species} from '../game/progress.js';
import {sideStems} from './growth.js';
import {seedHash, specimenParts} from './parts.js';
import {bookPaper, drawPaper, placeTapes, drawMounts} from './paper.js';
export {seedCode,seedHash,composition} from './parts.js';

const radians = degrees => degrees * Math.PI / 180;
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function socketColor(sprite, nx, ny) {
  const [r,g,b] = sprite.getContext('2d').getImageData(Math.floor(nx*sprite.width), Math.floor(ny*sprite.height), 1, 1).data;
  return 'rgb('+r+','+g+','+b+')';
}
function junctionInks(m, paint) {
  if (!paint || m.version !== 3) return [];
  return [...m.leaves, ...m.flowers].map((organ, index) => {
    const {base} = organ;
    const start = socketColor(paint[0], (base.x-m.x)/m.stemW, (base.y-m.y)/m.stemH);
    const end = organ.anchorY < .82 ? start : socketColor(paint[index+1], organ.anchorX, organ.anchorY);
    return [start, end];
  });
}
function drawJunction(c, organ, inks, pose) {
  const {base, control1, control2, x, y} = organ;
  const ink = c.createLinearGradient(base.x, base.y, x, y);
  ink.addColorStop(0, inks[0]); ink.addColorStop(1, inks[1]);
  // The receiving socket stays fixed; its branch tangent follows the rotation.
  const a = radians(pose.turn), dx = control2.x-x, dy = control2.y-y;
  c.beginPath(); c.moveTo(base.x, base.y);
  c.bezierCurveTo(control1.x, control1.y, x+dx*Math.cos(a)-dy*Math.sin(a), y+dx*Math.sin(a)+dy*Math.cos(a), x, y);
  c.strokeStyle = ink; c.lineWidth = organ.thickness; c.lineCap = 'butt'; c.stroke();
}

const headPressure = {
  // Lateral spreading, loss of projected height, twist at the pedicel.
  daisy: [.12, .09, 6], cornflower: [.09, .12, 8],
  poppy: [.21, .19, 13], clover: [.06, .08, 4]
};
function strain(layer, seed, index) {
  const [species, organ] = layer.part.file.split('-');
  const hash = seedHash(JSON.stringify([seed, layer.part.file, index, 'press']));
  const amount = .64 + .36 * (hash / 0xffffffff), side = (hash & 1) ? 1 : -1;
  let [width, height, turn] = headPressure[species];
  if (organ === 'leaves') {
    width = .12; height = -.025; turn = 11;
  } else if (organ === 'buds') {
    width = .07; height = .09; turn = 9;
  } else if (organ === 'petals') {
    width = .04; height = .06; turn = 5;
  }
  return {width: width * amount, height: height * amount, turn: turn * amount * side,
    lift: (species === 'clover' && organ === 'heads' ? 1.15 : .65) * amount};
}

function drawTapes(out, transform, tapes, opacity) {
  if (!opacity) return;
  out.save(); out.setTransform(transform); out.globalAlpha = opacity;
  for (const strip of tapes) {
    out.save(); out.translate(strip.x,strip.y); out.rotate(radians(strip.angle));
    const w=strip.width/2; out.beginPath(); out.moveTo(-w,-4); out.lineTo(w,-4.6); out.lineTo(w-1,4.2); out.lineTo(-w+1,4.6); out.closePath();
    out.fillStyle='rgba(225,201,146,.66)'; out.fill(); out.strokeStyle='rgba(146,122,75,.36)'; out.lineWidth=.6; out.stroke(); out.restore();
  }
  out.restore();
}

function frameRenderer(target, plant, {m, layers, fresh, dry}, paper) {
  const w = target.width, h = target.height;
  const sheet = canvas(w,h), c = sheet.getContext('2d',{willReadFrequently:true});
  const out = target.getContext('2d',{willReadFrequently:true});
  const freshInks = junctionInks(m, fresh), dryInks = junctionInks(m, dry);
  const strains = layers.map((layer, i) => strain(layer, plant.seed, i));
  const attached = m.leaves.length + m.flowers.length;
  let second, blend;
  const background = paper && canvas(w,h);
  if (background) drawPaper(background.getContext('2d', {willReadFrequently:true}), plant);

  function paint(ctx, sprites, inks, dryPass, p, poses, rotate = true) {
    const cw=ctx.canvas.width, ch=ctx.canvas.height;
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cw,ch);
    ctx.scale(cw/250,ch/310);
    if (rotate) {
      ctx.translate(125,155); ctx.rotate(radians(m.tilt + p*m.pressAngle)); ctx.translate(-125,-155);
    }
    if (m.version === 3) {
      for (let i=0; i<attached; i++) drawJunction(ctx, layers[i], inks[i], poses[i]);
    }
    ctx.drawImage(sprites[0],m.x,m.y,m.stemW,m.stemH);
    if (m.version !== 3) for (const f of sideStems(m)) {
      ctx.beginPath(); ctx.moveTo(f.base.x,f.base.y+1); ctx.quadraticCurveTo(f.x,f.base.y-5,f.x,f.y-1);
      ctx.strokeStyle=dryPass?'#927248':'#627f40'; ctx.lineWidth=1.6; ctx.lineCap='round'; ctx.stroke();
    }
    for (let i=0; i<sprites.length-1; i++) {
      const l = layers[i], pose = poses[i], sw = l.height*l.part.width/l.part.height;
      ctx.save(); ctx.translate(l.x,l.y); ctx.rotate(radians(l.angle+pose.turn)); ctx.scale(l.flip*pose.width,pose.height);
      if (pose.shadow) {
        ctx.shadowColor='rgba(74,54,33,.26)'; ctx.shadowBlur=pose.shadow*cw/250;
        ctx.shadowOffsetY=pose.shadow*ch/310;
      }
      ctx.drawImage(sprites[i+1],-sw*(l.anchorX??l.part.anchorX),-l.height*(l.anchorY??l.part.anchorY),sw,l.height);
      ctx.restore();
    }
  }

  function posesAt(p) {
    // Early saved forms keep their historical endpoint pose and pigment.
    const pressure = m.version === 3 ? p : p === 1 ? 0 : Math.sin(Math.PI*p)*.52;
    return strains.map(s => ({width: 1+s.width*pressure, height: 1-s.height*pressure,
      turn: s.turn*pressure, shadow: s.lift*pressure}));
  }
  let strips;
  if (dry && (paper || m.version === 3)) {
    const mask = canvas(250,310).getContext('2d', {willReadFrequently:true});
    mask.drawImage(dry[0],m.x,m.y,m.stemW,m.stemH);
    const stem=mask.getImageData(0,0,250,310).data;
    paint(mask,dry,dryInks,true,1,posesAt(1),false);
    strips=placeTapes(m,stem,mask.getImageData(0,0,250,310).data,plant.seed);
  }
  return value => {
    const p = Math.max(0,Math.min(1,value)), poses=posesAt(p);
    const dryOnly = p === 1;
    paint(c, dryOnly ? dry : fresh, dryOnly ? dryInks : freshInks, dryOnly, p, poses);
    const transform = c.getTransform();
    let image = sheet;
    if (p>0 && p<1) {
      second ??= canvas(w,h); blend ??= canvas(w,h);
      paint(second.getContext('2d',{willReadFrequently:true}), dry, dryInks, true, p, poses);
      // Both pigment plates have the same pose. Add premultiplied colours so
      // fine translucent edges keep their coverage throughout the transition.
      const mix = blend.getContext('2d',{willReadFrequently:true}); mix.clearRect(0,0,w,h); mix.save();
      mix.globalAlpha=1-p; mix.drawImage(sheet,0,0);
      mix.globalCompositeOperation='lighter'; mix.globalAlpha=p; mix.drawImage(second,0,0);
      mix.restore(); image = blend;
    }
    if (out.reset) out.reset(); else target.width = w;
    if (background && p>0) {
      out.save(); out.globalAlpha=p; out.drawImage(background,0,0); out.restore();
    }
    out.save();
    const cast = p===1 ? 'contrast(.98)' : p===0 ? 'drop-shadow(0px 3px 3px rgba(60,56,35,.18))'
      : 'contrast('+(1-.02*p)+') drop-shadow(0px '+(3*(1-p))+'px '+(3*(1-p))+'px rgba(60,56,35,'+(.18*(1-p))+'))';
    out.filter='hue-rotate('+m.hue+'deg) brightness('+m.light+') '+cast;
    out.globalAlpha=1-.08*p; out.drawImage(image,0,0); out.restore();
    const adhesion=Math.max(0,(p-.65)/.35);
    if (strips) drawMounts(out,transform,strips,adhesion);
    else drawTapes(out,transform,m.tapes,adhesion);
  };
}

// A transition holds one geometry, two sets of pigment plates and reusable
// drawing surfaces. Discarding the returned function releases its canvases.
export async function preparePress(target, plant, {paper = false} = {}) {
  return frameRenderer(target, plant, await specimenParts(plant, true), paper);
}
export async function drawSpecimen(target, plant, {paper = false} = {}) {
  const draw = frameRenderer(target, plant, await specimenParts(plant), paper);
  draw(plant.state === 'pressed' ? 1 : 0);
}
export async function postcard(plant,number){
  const card=canvas(900,1200),c=card.getContext('2d', {willReadFrequently:true}),sp=species[plant.speciesId];
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
  label(sourceTitle(plant)+' · '+plant.sourceLine,'23px Segoe UI',35);
  label('Сбор '+date(plant.collectedAt)+'   ·   Сушка '+date(plant.pressedAt),'23px Segoe UI',35);
  if(plant.note)label(plant.note,'italic 24px Georgia',33);
  card.height=Math.max(1200,1070+rows.reduce((h,r)=>h+r.step,0));
  c.fillStyle=bookPaper;c.fillRect(0,0,900,card.height);c.strokeStyle=journal.line;c.strokeRect(32,32,836,card.height-64);
  c.fillStyle=journal.caption;c.font='italic 31px Georgia';c.fillText('Bingo Bloom · Гербарий',62,79);
  c.textAlign='right';c.font='23px Georgia';c.fillText('№ '+String(number).padStart(3,'0'),837,79);c.textAlign='left';
  const art=canvas(650,806);await drawSpecimen(art,plant,{paper:true});c.drawImage(art,125,94);
  c.fillStyle=journal.ink;c.font='54px Georgia';c.fillText(sp.name,62,956);c.font='italic 28px Georgia';c.fillText(sp.latin,62,993);
  let y=1030;
  for(const row of rows){c.font=row.font;c.fillText(row.line,62,y);y+=row.step;}
  return new Promise((resolve,reject)=>card.toBlob(blob=>blob?resolve(blob):reject(Error('PNG')),'image/png'));
}

