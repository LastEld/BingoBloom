export const reduced=()=>document.documentElement.dataset.simpleMotion==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;
let audio;
export function sound(kind,enabled){
  if(!enabled)return;
  try{
    audio ||= new (window.AudioContext||window.webkitAudioContext)();
    audio.resume().catch(()=>{});
    const at=audio.currentTime;
    if(kind==='line'||kind==='flip'){
      const tones=kind==='line'?[392,494,587]:[460];
      tones.forEach((f,i)=>{const osc=audio.createOscillator(),gain=audio.createGain(),start=at+i*.09;osc.type='sine';osc.frequency.setValueAtTime(f,start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.045,start+.007);gain.gain.exponentialRampToValueAtTime(.0001,start+.24);osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+.25);});
    }else{
      const length=Math.floor(audio.sampleRate*.15),buf=audio.createBuffer(1,length,audio.sampleRate),arr=buf.getChannelData(0);
      for(let i=0;i<length;i++)arr[i]=(Math.random()*2-1)*Math.pow(1-i/length,3);
      const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();src.buffer=buf;filter.type='bandpass';filter.frequency.value=kind==='scratch'?1900:1100;gain.gain.value=.075;src.connect(filter);filter.connect(gain);gain.connect(audio.destination);src.start();
    }
  }catch{}
}
function particles(canvas,celebration){
  const ctx=canvas.getContext('2d'),rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.max(1,w*dpr);canvas.height=Math.max(1,h*dpr);ctx.scale(dpr,dpr);
  const colors=['#8a9b71','#d4a080','#d4b8cb','#aaa778','#edcfaa'],duration=celebration?1750:550;
  const bits=Array.from({length:celebration?52:45},()=>({x:Math.random()*w,y:celebration?-Math.random()*h*.55:Math.random()*h,angle:Math.random()*6.28,dx:(Math.random()-.45)*(celebration?70:60),speed:.65+Math.random()*.7,color:colors[Math.floor(Math.random()*colors.length)],s:2+Math.random()*(celebration?5:3)}));
  const start=performance.now();
  function frame(now){if(!canvas.isConnected)return;const t=Math.min(1,(now-start)/duration);ctx.clearRect(0,0,w,h);
    for(const p of bits){ctx.save();ctx.translate(p.x+Math.sin(t*5+p.angle)*p.dx,p.y+(celebration?(h*1.35*t*t+100*t)*p.speed:-60*t*p.speed));ctx.rotate(p.angle+t*4);ctx.globalAlpha=(1-t)*.9;ctx.fillStyle=p.color;ctx.beginPath();ctx.ellipse(0,0,p.s,p.s*.48,0,0,2*Math.PI);ctx.fill();ctx.restore();}
    if(t<1)requestAnimationFrame(frame);else canvas.remove();
  }
  requestAnimationFrame(frame);
}
export function petals(parent=document.body){
  if(reduced())return;const c=document.createElement('canvas');c.className='petals';c.setAttribute('aria-hidden','true');parent.append(c);particles(c,true);
}
