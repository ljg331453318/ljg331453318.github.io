import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePastedBirthDate} from '../cloud-dao/birth-date.js';
test('birth dates accept direct typing formats without calendar navigation or day/month ambiguity',()=>{
 const expected={year:'1990',month:'05',day:'15'};
 for(const value of ['19900515','1990-05-15','1990/5/15','1990年5月15日'])assert.deepEqual(parsePastedBirthDate(value),expected);
 assert.equal(parsePastedBirthDate('05/15/1990'),null);
});
test('impossible birthdays and invalid leap days are rejected',()=>{
 assert.equal(parsePastedBirthDate('19000229'),null);
 assert.deepEqual(parsePastedBirthDate('20000229'),{year:'2000',month:'02',day:'29'});
 for(const value of ['20260230','20261301','18000101','30000101','1990-00-15'])assert.equal(parsePastedBirthDate(value),null);
});
