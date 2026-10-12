import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarQuery} from '../src/work/calendar-input.js';
test('calendar validates month/day and uses exclusive Vietnam month boundaries',()=>{
 const q=calendarQuery({month:'2024-02'});assert.equal(q.start.toISOString(),'2024-01-31T17:00:00.000Z');assert.equal(q.end.toISOString(),'2024-02-29T17:00:00.000Z');
 assert.equal(calendarQuery({month:'2024-02',day:'2024-02-29'},true).dayStart.toISOString(),'2024-02-28T17:00:00.000Z');
 assert.equal(calendarQuery({month:'2024-02',day:'none'},true).dayStart,null);
 for(const input of [{month:'2024-13'},{month:'0010-01'},{month:'2024-02',userId:'forged'},{month:['2024-02']},{month:'2024-02',cursor:'forged'}])assert.throws(()=>calendarQuery(input));
 for(const day of ['2024-02-30','2024-03-01','none or true',''])assert.throws(()=>calendarQuery({month:'2024-02',day},true));
});
