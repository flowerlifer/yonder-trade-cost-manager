import {test} from 'node:test';import assert from 'node:assert/strict';import {demo,blank,calculate,validate} from '../lib/model';
test('演示成本与收益',()=>{const c=calculate(demo());assert.equal(c.cost.toString(),'650000');assert.equal(c.revenue.toString(),'832000');assert.equal(c.profit.toString(),'182000');assert.equal(c.unit?.toString(),'25');assert(c.valid);});
test('零分母安全',()=>{const c=calculate(blank());assert.equal(c.unit,null);assert.equal(c.margin,null);assert.equal(c.breakeven,null);assert(!c.valid);});
test('精确十进制',()=>{const p=demo();p.estimated=['0.1','0.2','0','0','0','0','0','0'];assert.equal(calculate(p).cost.toString(),'0.3');});
test('自定义比例、切换和亏损',()=>{const p=demo();p.mode='custom';assert(calculate(p).valid);p.investors[0].share='49';assert(!calculate(p).valid);p.mode='capital';assert(calculate(p).valid);assert.equal(p.investors[0].share,'49');p.price='0';assert.equal(calculate(p).profit.toString(),'-650000');});
test('拒绝负数和无效输入',()=>{const p=demo();p.price='-1';assert.throws(()=>validate(p));p.price='abc';assert.throws(()=>validate(p));});
