// Distances are in the common 250 × 310 specimen view. Nodes run from tip to base.
const habits={
  daisy:{height:[149,194],spread:[24,46],heads:4,leaf:[34,58],head:[32,51]},
  cornflower:{height:[171,204],spread:[20,42],heads:3,leaf:[42,68],head:[33,49]},
  poppy:{height:[156,197],spread:[24,47],heads:3,leaf:[37,64],head:[40,59]},
  clover:{height:[138,174],spread:[21,42],heads:3,leaf:[34,54],head:[32,48]}
};
export function grow(parts,rand){
  const range=(a,b)=>a+(b-a)*rand(),pick=list=>list[Math.floor(rand()*list.length)];
  const stem=pick(parts.stems),kind=stem.file.split('-')[0],habit=habits[kind];
  const stemH=range(...habit.height),stemW=stem.width/stem.height*stemH;
  const x=125-stemW*stem.anchorX,y=276-stemH*stem.anchorY;
  const nodes=stem.growthNodes.map(([a,b])=>({x:x+a*stemW,y:y+b*stemH}));
  function junction(position){
    const t=position*(nodes.length-1),index=Math.min(Math.floor(t),nodes.length-2),f=t-index;
    const a=nodes[index],b=nodes[index+1];
    return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};
  }
  const leaves=[],flowers=[],tapes=[],petals=[];
  const handed=rand()<.5?1:-1,spread=range(...habit.spread),height=range(...habit.head);
  const flowerCount=1+Math.floor(rand()*habit.heads),leafCount=2+Math.floor(rand()*4);
  for(let i=0;i<flowerCount;i++){
    const side=handed*(i%2===0?-1:1);
    const base=junction(i===0?0:range(.14,.28)+(i-1)*.15);
    const bud=i>0&&rand()<(kind==='poppy' ? .83 : .55);
    const reach=i===0?0:spread*range(.75,1.12);
    flowers.push({part:pick(bud?parts.buds:parts.heads),base,
      x:base.x+side*reach,y:base.y-(i===0?range(3,6):range(19,43)),
      angle:range(-10,10)+(i?side*range(5,20):0),flip:rand()<.5?-1:1,
      height:height*(i===0?1:bud?range(.40,.64):range(.59,.83)),
      depth:i===0?0:range(8,24)*(i%2?1:-1),curl:range(-6,8)});
  }
  for(let i=0;i<leafCount;i++){
    const side=handed*(i%2===0?1:-1),part=pick(parts.leaves),flip=rand()<.5?-1:1;
    // Compensate for an off-centre petiole so the blade actually grows outward.
    const naturalLean=Math.atan2(flip*(.5-part.anchorX)*part.width,part.anchorY*part.height)*180/Math.PI;
    const angle=side*range(kind==='clover'?33:19,kind==='clover'?67:60)-naturalLean;
    const tier=(i+range(.15,.80))/leafCount;
    leaves.push({part,...junction(.26+tier*.70),height:range(...habit.leaf)*(.82+.24*tier),
      angle,flip,depth:0,curl:range(9,24)*(i%3===0?-1:1)});
  }
  const count=1+Math.floor(rand()*2);
  for(let i=0;i<count;i++)tapes.push({...junction(i===0?range(.64,.86):range(.32,.54)),width:range(28,39),angle:range(-17,17)});
  const fallen=1+Math.floor(rand()*3);
  for(let i=0;i<fallen;i++){
    const leaf=i===1&&rand()<.40;
    petals.push({part:pick(leaf?parts.leaves:parts.petals),x:125+(i%2===0?-1:1)*range(46,75),
      y:range(174,245),height:leaf?range(21,32):range(11,21),angle:range(-85,85),flip:1});
  }
  return {stem,x,y,stemW,stemH,leaves,flowers,tapes,petals,tilt:range(-10,10),pressAngle:range(-16,16),hue:range(-4,4),light:range(.97,1.04)};
}
export function sideStems(m){
  return m.flowers.filter(f=>f.x!==f.base.x||f.y!==f.base.y);
}
