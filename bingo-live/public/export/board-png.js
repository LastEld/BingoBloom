import {themes,artNames,lineIds,covers} from '../game/board.js';
const imageCache=new Map();
function image(name){
  if(!imageCache.has(name))imageCache.set(name,new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src='/assets/'+name;}));
  return imageCache.get(name);
}
function rounded(ctx,x,y,w,h,r,fill,stroke){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
}
function wrapped(ctx,text,x,y,maxWidth,maxLines,lineHeight){
  const words=text.split(/\s+/),lines=[];let current='';
  for(const word of words){
    if(ctx.measureText(word).width>maxWidth){
      if(current){lines.push(current);current='';}
      for(const ch of word){if(current&&ctx.measureText(current+ch).width>maxWidth){lines.push(current);current='';}current+=ch;}
    }else if(current&&ctx.measureText(current+' '+word).width>maxWidth){lines.push(current);current=word;}
    else current+= (current?' ':'')+word;
  }
  if(current)lines.push(current);
  const clipped=lines.slice(0,maxLines);
  if(lines.length>maxLines){let last=clipped[maxLines-1];while(last.length&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);clipped[maxLines-1]=last+'…';}
  clipped.forEach((s,i)=>ctx.fillText(s,x,y+i*lineHeight));return clipped.length*lineHeight;
}
export async function makePNG(board,format){
  const canvas=document.createElement('canvas'),wide=1080,tall=format==='story'?1920:1080,story=tall>wide;
  canvas.width=wide;canvas.height=tall;const c=canvas.getContext('2d'),t=themes[board.theme];
  const colors=Array.from({length:9},(_,i)=>getComputedStyle(document.documentElement).getPropertyValue('--tile'+i).trim());
  const pictures=await Promise.all(board.cells.map(cell=>artNames.includes(cell.icon)?image('icons/icon-'+cell.icon+'.png'):Promise.resolve(null)));
  const hero=await image('covers/'+(covers[board.cover] || covers.glasshouse).file),margin=58,inner=wide-margin*2,total=board.cells.length,count=board.cells.filter(x=>x.done).length;
  c.fillStyle=t.paper;c.fillRect(0,0,wide,tall);c.textAlign='left';c.fillStyle=t.ink;c.font='italic 31px Georgia';c.fillText('Bingo Bloom',margin,61);
  const bannerH=story?350:145,bannerY=91;rounded(c,margin,bannerY,inner,bannerH,23,t.hero,t.line);
  if(hero){
    c.save();c.beginPath();c.roundRect(margin,bannerY,inner,bannerH,23);c.clip();
    const scale=Math.max(inner/hero.width,bannerH/hero.height),w=hero.width*scale,h=hero.height*scale;
    c.drawImage(hero,margin+(inner-w)/2,bannerY+(bannerH-h)/2,w,h);
    const wash=c.createLinearGradient(margin,0,margin+inner,0);
    wash.addColorStop(0,'#fbf9eafc');wash.addColorStop(.68,'#fbf9eaf0');wash.addColorStop(1,'#fbf9ea30');
    c.fillStyle=wash;c.fillRect(margin,bannerY,inner,bannerH);c.restore();
  }
  c.fillStyle='#3f4e3a';c.font='bold 17px Segoe UI';c.fillText('ЛИЧНАЯ БИНГО-ДОСКА',margin+25,bannerY+36);
  c.fillStyle='#2d3e2d';c.font=(story?'56':'42')+'px Georgia';wrapped(c,board.title,margin+25,bannerY+(story?100:87),story?800:625,2,story?58:44);
  const bound=lineIds(board),lineSet=new Set(bound.flat());
  const labelY=bannerY+bannerH+(story?80:47);c.font='26px Georgia';c.fillText('Моё поле',margin,labelY);
  c.textAlign='right';c.font='20px Segoe UI';c.fillText(count+' из '+total+' выполнено',wide-margin,labelY);
  const gridY=labelY+(story?34:20),gridH=story?1050:Math.min(665,tall-gridY-78),gap=12,n=board.size,cw=(inner-gap*(n-1))/n,ch=(gridH-gap*(n-1))/n;
  for(let i=0;i<total;i++){
    const cell=board.cells[i],x=margin+i%n*(cw+gap),y=gridY+Math.floor(i/n)*(ch+gap),cx=x+cw/2;
    rounded(c,x,y,cw,ch,15,cell.done?t.card:colors[cell.color%9],lineSet.has(i)?t.accent:t.line);
    c.textAlign='center';const imgH=Math.min(cw*.28,ch*.31),imgY=y+ch*.1;
    if(cell.done){c.fillStyle=t.accent;c.font='bold '+Math.floor(imgH*.72)+'px Segoe UI';c.fillText('✓',cx,imgY+imgH*.82);}
    else if(pictures[i])c.drawImage(pictures[i],cx-imgH/2,imgY,imgH,imgH);
    else{c.font=Math.round(imgH*.8)+'px Segoe UI Emoji';c.fillText(cell.icon,cx,imgY+imgH*.8);}
    let font=Math.min(story?32:27,Math.floor(cw/8.5),Math.floor(ch*.155));
    c.fillStyle=t.ink;c.font=(cell.done?'italic ':'500 ')+font+'px '+(cell.done?'Georgia':'Segoe UI');
    const textY=imgY+imgH+font+4;wrapped(c,(cell.done?cell.reward:cell.task)||'Свободная клетка',cx,textY,cw-16,Math.max(1,Math.floor((y+ch-9-textY)/(font*1.17))+1),font*1.17);
  }
  c.textAlign='left';const y=gridY+gridH+(story?60:34);
  c.fillStyle=t.accent;c.font='bold 16px Segoe UI';c.fillText('НАГРАДА ЗА ЛИНИЮ',margin,y);
  c.fillStyle=t.ink;c.font='italic '+(story?39:28)+'px Georgia';wrapped(c,board.bonus,margin,y+(story?55:36),inner,story?3:2,story?44:29);
  c.textAlign='right';c.fillStyle=t.accent;c.font='16px Segoe UI';c.fillText('Собрано линий: '+bound.length,wide-margin,tall-23);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Не удалось создать изображение.')),'image/png'));
}
