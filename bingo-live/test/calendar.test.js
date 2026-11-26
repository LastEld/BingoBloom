import test from 'node:test';
import assert from 'node:assert/strict';
import { endOfPeriod, calendarMonth, boardPeriod } from '../public/game/calendar.js';
import { newStudio, decodeStudio } from '../public/game/progress.js';

test('Calendar deadlines keep local clock time and clamp short months and leap years',()=>{
  const jan=new Date(2028,0,31,16,45);
  assert.deepEqual(endOfPeriod(jan,'На месяц'),new Date(2028,1,29,16,45));
  assert.deepEqual(endOfPeriod(new Date(2028,1,29,9,20),'На год'),new Date(2029,1,28,9,20));
  assert.deepEqual(endOfPeriod(jan,'На две недели'),new Date(2028,1,14,16,45));
});
test('One annual period can be removed across months and restored without clearing the board',()=>{
  const s=newStudio(),b=s.boards[0],at=new Date(2027,3,2);
  b.calendarStart=new Date(2027,0,15,12).toISOString();b.durationLabel='На год';
  assert.equal((calendarMonth(s,at).match(/class="calendar-cycle"/g)||[]).length,1);
  b.calendarHidden=true;
  const restored=decodeStudio(JSON.stringify(s));
  assert.doesNotMatch(calendarMonth(restored,at),/class="calendar-cycle"/);
  assert.deepEqual(restored.boards[0].cells,b.cells);
  restored.boards[0].calendarHidden=false;
  assert.match(calendarMonth(restored,new Date(2027,10,2)),/class="calendar-cycle"/);
  assert.deepEqual(boardPeriod(restored.boards[0]).end,new Date(2028,0,15,12));
});
