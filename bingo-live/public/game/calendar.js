import { esc } from './board.js';

const stamp = new Intl.DateTimeFormat('ru-RU', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
const dates = new Intl.DateTimeFormat('ru-RU', {day:'numeric', month:'long', year:'numeric'});
const monthTitle = new Intl.DateTimeFormat('ru-RU', {month:'long', year:'numeric'});
const remaining = new Intl.NumberFormat('ru-RU', {style:'unit', unit:'day', unitDisplay:'long'});

export function localInput(date) {
  const part = n => String(n).padStart(2, '0');
  return date.getFullYear()+'-'+part(date.getMonth()+1)+'-'+part(date.getDate())+'T'+part(date.getHours())+':'+part(date.getMinutes());
}

export function endOfPeriod(start, period) {
  const end = new Date(start);
  if (period === 'На месяц' || period === 'На год') {
    const day = end.getDate();
    end.setDate(1);
    end.setMonth(end.getMonth() + (period === 'На год' ? 12 : 1));
    const last = new Date(end.getFullYear(), end.getMonth()+1, 0).getDate();
    end.setDate(Math.min(day,last));
  } else end.setDate(end.getDate() + (period === 'На две недели' ? 14 : 7));
  return end;
}

export function boardPeriod(board) {
  const start = new Date(board.calendarStart || board.startedAt || board.created);
  return {start, end:endOfPeriod(start,board.durationLabel)};
}
export const formatPeriod = ({start,end}) => stamp.format(start)+' — '+stamp.format(end);
// The deadline is exclusive. A cycle ending at midnight covers the preceding day.
export const calendarRange = ({start,end}) => dates.formatRange(start, new Date(end.getTime()-1));

export function periodStatus({start,end}, now = new Date()) {
  if (now < start) return 'До начала · '+remaining.format(Math.ceil((start-now)/86400000));
  if (now >= end) return 'Период истёк';
  const hours = Math.ceil((end-now)/3600000);
  return hours < 24 ? 'До окончания · '+hours+' ч' : 'До окончания · '+remaining.format(Math.ceil(hours/24));
}

export function calendarMonth(store, month, now = new Date()) {
  const first = new Date(month.getFullYear(),month.getMonth(),1);
  const next = new Date(month.getFullYear(),month.getMonth()+1,1);
  const width = next-first;
  const rows = store.boards.filter(board=>!board.calendarHidden).map(board => ({board,...boardPeriod(board)}))
    .filter(p=>p.start<next && p.end>first).sort((a,b)=>a.start-b.start);
  const today = now>=first && now<next ? (now-first)/width*100 : null;
  const list = rows.map(({board,start,end})=>{
    const left = Math.max(0,(start-first)/width)*100;
    const right = Math.min(1,(end-first)/width)*100;
    return `<article class="calendar-cycle"><button class="calendar-board" data-do="calendar-open:${esc(board.id)}">
      <span class="spread"><strong>${esc(board.title)}</strong><small>${esc(board.durationLabel)}</small></span>
      <span class="calendar-dates">${formatPeriod({start,end})}</span>
      <span class="calendar-track"><i style="left:${left}%;width:${right-left}%"></i>${today===null?'':'<b title="Сегодня" style="left:'+today+'%"></b>'}</span>
    </button><button class="quiet" data-do="unlist:${esc(board.id)}">Убрать из календаря</button></article>`;
  }).join('');
  return `<div class="calendar-month"><button class="round" data-do="month:-1" aria-label="Предыдущий месяц">‹</button>
    <h3>${monthTitle.format(first)}</h3><button class="round" data-do="month:1" aria-label="Следующий месяц">›</button></div>
    <div class="calendar-scale"><span>1</span><button class="quiet" data-do="month:today">Сегодня</button><span>${new Date(next.getTime()-1).getDate()}</span></div>
    ${list || '<p class="hint">На этот месяц пока нет досок.</p>'}`;
}
