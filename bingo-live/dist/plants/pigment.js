// Interpolate two scales of seeded noise in sprite space so the wash follows
// the same petal at every display size, including a printed postcard.
function noiseField(cells, random) {
  const stride = cells + 1;
  const samples = Float32Array.from({length: stride * stride}, random);
  return (x,y) => {
    const gx=x*cells, gy=y*cells, i=Math.floor(gy)*stride+Math.floor(gx);
    const fx=gx%1, fy=gy%1;
    const u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy);
    return (samples[i]*(1-u)+samples[i+1]*u)*(1-v)
      +(samples[i+stride]*(1-u)+samples[i+stride+1]*u)*v;
  };
}

function pigmentMask(raster, random) {
  const {width,height,data}=raster;
  const broad=noiseField(3,random), fine=noiseField(8,random);
  const mask=new Float32Array(width*height);
  let min=1,max=0;
  for(let i=0;i<mask.length;i++){
    const alpha=data[i*4+3];
    if(!alpha)continue;
    const x=(i%width+.5)/width,y=(Math.floor(i/width)+.5)/height;
    mask[i]=.82*broad(x,y)+.18*fine(x,y);
    if(alpha>128){min=Math.min(min,mask[i]);max=Math.max(max,mask[i]);}
  }
  const span=Math.max(.08,max-min);
  for(let i=0;i<mask.length;i++){
    const t=Math.max(0,Math.min(1,((mask[i]-min)/span-.20)/.64));
    mask[i]=t*t*(3-2*t);
  }
  return mask;
}

export function tintSprite(image,file,pressed,random){
  const surface=document.createElement('canvas');
  surface.width=image.naturalWidth;surface.height=image.naturalHeight;
  const ctx=surface.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0);
  const raster=ctx.getImageData(0,0,surface.width,surface.height),p=raster.data;
  const [species,organ]=file.split('-');
  const foliage=organ==='stems'||organ==='leaves';
  const floralTone=species==='daisy'?[1.08,.97,.78]:species==='cornflower'?[1.09,.84,.83]:[1.21,.77,.62];
  const leafTone=[1.12,.91,.62],mask=pressed?pigmentMask(raster,random):null;
  for(let i=0;i<p.length;i+=4){
    if(!p[i+3])continue;
    const r=p[i],g=p[i+1],b=p[i+2],lum=.27*r+.57*g+.16*b;
    const green=foliage||(g>=r*.94&&g>b*1.10&&r-b>3);
    const sat=green?1.50:1.36;
    const freshR=lum+(r-lum)*sat+(green?-8:2);
    const freshG=lum+(g-lum)*sat+(green?9:1);
    const freshB=lum+(b-lum)*sat+(green?-6:1);
    if(!pressed){p[i]=freshR;p[i+1]=freshG;p[i+2]=freshB;continue;}

    const keep=green ? .06+mask[i/4]*(organ==='stems' ? .26 : .52) : .09+mask[i/4]*.90;
    const paper=21+lum*.83,trace=green ? .16 : .26,tone=green?leafTone:floralTone;
    const dryR=paper*tone[0]+(r-lum)*trace, dryG=paper*tone[1]+(g-lum)*trace, dryB=paper*tone[2]+(b-lum)*trace;
    p[i]=dryR+(freshR-dryR)*keep;
    p[i+1]=dryG+(freshG-dryG)*keep;
    p[i+2]=dryB+(freshB-dryB)*keep;
  }
  ctx.putImageData(raster,0,0);return surface;
}
