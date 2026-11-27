import {grow} from './growth.js';
import {growV3} from './growth-v3.js';
import {tintSprite} from './pigment.js';
const directory='/assets/plants/';
const originals=new Map();
const washes=new Map();
let catalog;
export function seedHash(seed) {
  let h=2166136261;
  for(const char of String(seed))h=Math.imul(h^char.codePointAt(0),16777619);
  return h>>>0;
}
export const seedCode=seed=>seedHash(seed).toString(16).toUpperCase().padStart(8,'0');
export function generator(seed){
  let a=seedHash(seed);
  return ()=>{
    a=(a+0x6D2B79F5)|0;
    let t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
export function composition(parts,seed,version=1){
  if(version===3){
    const stream=name=>generator(JSON.stringify([3,parts.stems[0].file.split('-')[0],seed,name]));
    return growV3(parts,stream('form'),stream('pigment'),stream('mounting'));
  }
  if(version===2)return grow(parts,generator(seed));
  const rand=generator(seed),range=(a,b)=>a+(b-a)*rand();
  const pick=a=>a[Math.floor(rand()*a.length)];
  const stem=pick(parts.stems),stemH=range(176,193),stemW=stem.width/stem.height*stemH;
  const x=126-stem.anchorX*stemW,y=276-stem.anchorY*stemH;
  const nodes=stem.nodes.map(([nx,ny])=>({x:x+nx*stemW,y:y+ny*stemH}));
  const leaves=[],flowers=[],tapes=[],petals=[];
  const leafCount=Math.floor(range(2,5)),flowerCount=Math.floor(range(1,4));
  for(let i=0;i<leafCount;i++){
    const side=(i%2?1:-1);
    leaves.push({part:pick(parts.leaves),...nodes[2+i],angle:side*33+range(-25,25),flip:rand()<.5?-1:1,height:range(46,66)*range(.9,1.1)});
  }
  for(let i=0;i<flowerCount;i++){
    const base=nodes[i],side=i%2?-1:1;
    const bud=i>0&&rand()<.75;
    flowers.push({part:pick(bud?parts.buds:parts.heads),base,
      x:base.x+(i?side*range(21,46):0),y:base.y-(i?range(15,35):0),
      angle:range(-15,15),flip:1,height:(bud?range(25,40):range(41,58))*range(.9,1.1)});
  }
  const tapeCount=Math.floor(range(1,3));
  for(let i=0;i<tapeCount;i++){
    const j=i?2:4,t=range(.1,.9);
    tapes.push({x:nodes[j].x*(1-t)+nodes[j+1].x*t,y:nodes[j].y*(1-t)+nodes[j+1].y*t,width:range(28,41),angle:range(-16,16)});
  }
  const numPetals=Math.floor(range(1,4));
  for(let i=0;i<numPetals;i++)petals.push({part:pick(parts.petals),x:(i%2?1:-1)*range(46,77)+125,y:range(143,248),height:range(12,21),angle:range(-75,75),flip:1});
  return {stem,x,y,stemW,stemH,leaves,flowers,tapes,petals,tilt:range(-10,10),pressAngle:range(-18,18),hue:range(-8,8),light:range(.94,1.06)};
}
function loadPart(part, pressed, seed, index, version, role){
  const file=part.file;
  const key=JSON.stringify(pressed ? [version,file,seed,role,'pressed'] : [version,file,'fresh']);
  if(washes.has(key))return washes.get(key);
  if(!originals.has(file)){
    const img=new Image();
    img.src=directory+file.split('-')[0]+'/'+file;
    originals.set(file,img.decode().then(()=>img).catch(err=>{originals.delete(file);throw err;}));
  }
  const maskSeed=version===3 ? key : JSON.stringify([file,seed,index]);
  const wash=originals.get(file).then(img=>tintSprite(img,file,pressed,pressed?generator(maskSeed):null,version))
    .catch(err=>{if(washes.get(key)===wash)washes.delete(key);throw err;});
  washes.set(key,wash);
  if(washes.size>64)washes.delete(washes.keys().next().value);
  return wash;
}
export async function specimenParts(plant, transition = false) {
  catalog ??= fetch(directory + 'catalog.json').then(response => {
    if (!response.ok) throw Error('catalog');
    return response.json();
  }).catch(error => { catalog = null; throw error; });
  const version = plant.formVersion ?? 1;
  const m = composition((await catalog)[plant.speciesId], plant.seed, version);
  const layers = [...m.leaves, ...m.flowers, ...m.petals];
  const parts = [m.stem, ...layers.map(layer => layer.part)];
  const roles = ['stem', ...m.leaves.map((_, i) => 'leaf' + i),
    ...m.flowers.map((_, i) => 'flower' + i), ...m.petals.map((_, i) => 'petal' + i)];
  function load(pressed) {
    const visible = pressed ? parts : parts.slice(0, 1 + m.leaves.length + m.flowers.length);
    return Promise.all(visible.map((part, i) =>
      loadPart(part, pressed, plant.seed, i, version, version === 3 ? roles[i] : i)));
  }
  const pressed = plant.state === 'pressed';
  const [fresh, dry] = await Promise.all([
    (transition || !pressed) && load(false), (transition || pressed) && load(true)
  ]);
  return {m, layers, fresh, dry};
}
