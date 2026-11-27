import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBoard, lineIds} from '../public/game/board.js';
import {newStudio, startBoard, completeCell, completeCells, pressPlant, finishBoard, repeatBoard, decodeStudio} from '../public/game/progress.js';
import {composition} from '../public/plants/specimen.js';

const catalog=JSON.parse(readFileSync(new URL('../public/assets/plants/catalog.json',import.meta.url)));
test('A group counts distinct lines once and rejects the whole selection when even an empty basket is too small', () => {
  const {s, b} = cycle();
  const before = JSON.stringify(s);
  const refused = completeCells(s, b, [0,1,2,3,4,5,6,7,8]);
  assert.deepEqual([refused.required, refused.free, refused.needed], [8,6,2]);
  assert.equal(JSON.stringify(s), before);
  const result = completeCells(s, b, [0,1,2,0,3,6,3]);
  assert.deepEqual(result.awards.map(award => award.cellIndices), [[0,1,2],[0,3,6]]);
  assert.equal(b.cells.filter(cell => cell.done).length, 5);
  assert.equal(new Set(s.basket.map(plant => plant.collectionId)).size, 1);
  assert.deepEqual(decodeStudio(JSON.stringify(s)), s);
});
function cycle(){
  const s=newStudio(),b=s.boards[0];
  startBoard(b,s.settings);
  return {s,b};
}
test('An intersection awards each new line once, and undo cannot farm the same flower',()=>{
  const {s,b}=cycle();
  for(const i of [1,2,3,6])assert.deepEqual(completeCell(s,b,i),{added:0,awards:[]});
  const result=completeCell(s,b,0);
  assert.deepEqual(result,{added:2,awards:[
    {uid:s.basket[0].uid,sourceLine:'A1–B1–C1',cellIndices:[0,1,2]},
    {uid:s.basket[1].uid,sourceLine:'A1–A2–A3',cellIndices:[0,3,6]}
  ]});
  assert.notEqual(s.basket[0].uid,s.basket[1].uid);
  assert.deepEqual(s.basket.map(p=>p.speciesId),['daisy','clover']);
  assert.ok(s.basket.every(p=>p.collectionId===s.basket[0].uid));
  assert.equal(s.book.length,0);assert.equal(s.basket.length,2);
  assert.ok(s.basket.every(p=>p.state==='fresh'&&p.pressedAt===null));
  const [flower]=s.basket,seed=flower.seed;
  const pressed=pressPlant(s,flower.uid);
  assert.equal(pressed.seed,seed);assert.equal(pressed.uid,flower.uid);assert.equal(pressed.state,'pressed');assert.ok(pressed.pressedAt);
  assert.equal(pressPlant(s,flower.uid),null);
  const restored=decodeStudio(JSON.stringify(s));
  assert.equal(restored.book[0].collectionId,flower.uid);
  assert.equal(restored.basket[0].collectionId,flower.uid);
  b.cells[0].done=0;assert.deepEqual(completeCell(s,b,0),{added:0,awards:[]});
  assert.equal(s.basket.length,1);assert.equal(s.book.length,1);
});
test('A multi-line move waits for sufficient basket slots and can be retried',()=>{
  const {s,b}=cycle();
  for(let i=0;i<8;i++)completeCell(s,b,i);
  const old=JSON.stringify(s),refused=completeCell(s,b,8);
  assert.deepEqual(refused,{added:0,awards:[],needed:2,required:3,free:1});
  const {needed}=refused;
  assert.equal(JSON.stringify(s),old);
  for(let i=0;i<needed;i++)pressPlant(s,s.basket[0].uid);
  const result=completeCell(s,b,8);
  assert.equal(result.added,3);
  assert.deepEqual(result.awards.map(a=>a.uid),s.basket.slice(-3).map(p=>p.uid));
  assert.equal(s.basket.length,6);assert.equal(lineIds(b).length,8);
  const next=repeatBoard(b);
  s.boards.push(next);startBoard(next,s.settings);
  assert.deepEqual(completeCell(s,next,4),{added:0,awards:[]});
  assert.ok(next.cells[4].done);
});
test('Four center lines are collected atomically as one ordered group',()=>{
  const fixture=new URL('../design/agent-handoff/center-four-lines.json',import.meta.url);
  const s=decodeStudio(readFileSync(fixture,'utf8')),b=s.boards[0];
  const before=JSON.stringify(s);
  assert.deepEqual(completeCell(s,b,4),{added:0,awards:[],needed:1,required:4,free:3});
  assert.equal(JSON.stringify(s),before);
  for(const plant of [...s.basket])pressPlant(s,plant.uid);
  const {added,awards}=completeCell(s,b,4);
  assert.equal(added,4);
  assert.deepEqual(awards.map(a=>a.cellIndices),[[3,4,5],[1,4,7],[0,4,8],[2,4,6]]);
  assert.deepEqual(awards.map(a=>a.sourceLine),s.basket.map(p=>p.sourceLine));
  assert.deepEqual(awards.map(a=>a.uid),s.basket.map(p=>p.uid));
  assert.equal(new Set(awards.map(a=>a.uid)).size,4);
  assert.ok(s.basket.every(p=>p.collectionId===awards[0].uid));
  b.cells[4].done=0;
  assert.deepEqual(completeCell(s,b,4),{added:0,awards:[]});
  assert.equal(s.basket.length,4);
});
test('Backup restores the active board, loose flowers, notes and immutable archived tasks',()=>{
  const {s,b}=cycle();
  for(let i=0;i<6;i++)completeCell(s,b,i);
  pressPlant(s,s.basket[0].uid).note='Первый сбор';
  finishBoard(s,b);assert.equal(s.history[0].harvest.length,2);
  const copy=s.boards[0];assert.notEqual(copy.boardSeed,b.boardSeed);assert.notEqual(copy.cells[0].id,b.cells[0].id);
  startBoard(copy,s.settings);completeCell(s,copy,4);
  const restored=decodeStudio(JSON.stringify(s));assert.deepEqual(restored,s);
  const replay=repeatBoard(s.history[0]);replay.cells[0].task='Новая задача';
  assert.notEqual(s.history[0].cells[0].task,replay.cells[0].task);
  assert.throws(()=>decodeStudio(JSON.stringify({...s,basket:s.book})));
  assert.throws(()=>decodeStudio(JSON.stringify({...s,version:99})));
});
test('Legacy boards keep their tasks, timestamps and theme without re-awarding past lines',()=>{
  const b=createBoard('cozy',4);b.started=true;b.cells.slice(0,4).forEach(c=>c.done=123);
  for(const key of ['boardSeed','startedAt','durationLabel','harvest','legacyLines'])delete b[key];
  const s=decodeStudio(JSON.stringify({boards:[b],active:b.id,sound:false}));
  assert.deepEqual(s.boards[0].cells,b.cells);assert.equal(s.boards[0].size,4);
  assert.deepEqual(s.boards[0].legacyLines,['A1–B1–C1–D1']);assert.deepEqual(decodeStudio(JSON.stringify(s)),s);
});
test('Every species uses reproducible assembly and seed-specific stems, leaves, buds and mounting strips',()=>{
  for(const parts of Object.values(catalog)){
    const models=Array.from({length:40},(_,i)=>composition(parts,'garden-'+i));
    assert.deepEqual(models[0],composition(parts,'garden-0'));
    assert.ok(new Set(models.map(m=>m.stem.file)).size>=2);
    assert.ok(new Set(models.flatMap(m=>m.leaves.map(l=>l.part.file))).size>=3);
    assert.ok(new Set(models.flatMap(m=>m.flowers.map(l=>l.part.file))).size>=4);
    assert.equal(new Set(models.map(m=>m.tilt)).size,40);
    assert.equal(new Set(models.map(m=>JSON.stringify(m.tapes))).size,40);
    for(const m of models){assert.ok(m.tapes.length>=1&&m.tapes.length<=2);assert.ok(m.petals.length>=1&&m.petals.length<=3);}
  }
});


test('New harvests retain their growth version through pressing and a JSON round trip',()=>{
  const {s,b}=cycle();
  [0,1].forEach(i=>completeCell(s,b,i));
  const first=completeCell(s,b,2);
  const fresh=s.basket[0];
  assert.deepEqual(first,{added:1,awards:[{uid:fresh.uid,sourceLine:'A1–B1–C1',cellIndices:[0,1,2]}]});
  assert.equal(fresh.collectionId,fresh.uid);
  assert.equal(fresh.formVersion,3);
  const original=composition(catalog[fresh.speciesId],fresh.seed,fresh.formVersion);
  pressPlant(s,fresh.uid);
  const stored=decodeStudio(JSON.stringify(s)).book[0];
  assert.deepEqual(composition(catalog[stored.speciesId],stored.seed,stored.formVersion),original);
  for(const version of [1,2]){
    s.book[0].formVersion=version;
    const restored=decodeStudio(JSON.stringify(s)).book[0];
    assert.equal(restored.formVersion,version);
    assert.deepEqual(composition(catalog[restored.speciesId],restored.seed,restored.formVersion),
      composition(catalog[fresh.speciesId],fresh.seed,version));
  }
  delete s.book[0].formVersion;
  const old=decodeStudio(JSON.stringify(s)).book[0];
  assert.equal(old.formVersion,undefined);
  assert.deepEqual(composition(catalog[old.speciesId],old.seed,old.formVersion),composition(catalog[old.speciesId],old.seed,1));
  assert.notDeepEqual(composition(catalog[old.speciesId],old.seed,1),original);
});

test('New specimens grow at ordered stem junctions with rising pedicels and alternating leaves',()=>{
  for(const parts of Object.values(catalog)){
    const silhouettes=new Set();
    for(let i=0;i<80;i++){
      const m=composition(parts,'habit-'+i,2);
      silhouettes.add(m.leaves.length+'/'+m.flowers.length);
      assert.ok(m.flowers.every(f=>f.y<f.base.y));
      assert.ok(m.flowers[0].part.file.includes('-heads-'));
      assert.ok(m.leaves.every((l,j)=>j===0||l.y>m.leaves[j-1].y));
      assert.ok(m.leaves.every(l=>Number.isFinite(l.curl)&&Math.abs(l.curl)>0));
      assert.ok(m.stemH>130&&m.stemH<210);
    }
    assert.ok(silhouettes.size>=10);
  }
});
