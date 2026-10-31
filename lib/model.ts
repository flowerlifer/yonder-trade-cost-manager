import Decimal from 'decimal.js';
Decimal.set({precision:40});
export type Row={id:string;name:string;amount:string;note:string;share:string;paid?:string};
export const estimateLabels=['采购成本','人工费','包装成本','运输成本','进口税','清关税','其他'] as const;
export type Goods={id:string;name:string;quantity:string;unit:string;amount:string;note:string};
export type Project={id:string;name:string;product:string;weight:string;salesWeight:string;price:string;note:string;mode:string;costs:Row[];investors:Row[];estimated?:string[];goods?:Goods[]};
export const d=(v:string)=>new Decimal(v||0);
export function calculate(p:Project){const cost=p.costs.reduce((a,r)=>a.plus(r.amount||0),d('0'));const capital=p.investors.reduce((a,r)=>a.plus(r.amount||0),d('0'));const revenue=d(p.salesWeight).times(p.price||0);const profit=revenue.minus(cost);const total=p.investors.reduce((a,r)=>a.plus(r.share||0),d('0'));return {cost,capital,revenue,profit,total,unit:d(p.weight).gt(0)?cost.div(p.weight):null,breakeven:d(p.salesWeight).gt(0)?cost.div(p.salesWeight):null,margin:revenue.gt(0)?profit.div(revenue).times(100):null,valid:p.investors.length>0&&(p.mode==='capital'?capital.gt(0):total.eq(100)),shares:p.investors.map(r=>p.mode==='capital'?(capital.gt(0)?d(r.amount).div(capital).times(100):d('0')):d(r.share))};}
export const blank=():Project=>({id:crypto.randomUUID(),name:'新项目',product:'',weight:'0',salesWeight:'0',price:'0',note:'',mode:'capital',costs:[],investors:[]});
export function demo():Project{return {...blank(),name:'委内瑞拉带鱼',product:'带鱼',weight:'26000',salesWeight:'26000',price:'32',costs:['鱼货成本','加工及冷冻','包装','海运及物流','税费及清关'].map((name,i)=>({id:crypto.randomUUID(),name,amount:['400000','65000','15000','70000','100000'][i],note:'虚构演示',share:'0'})),investors:['A','B','C'].map((name,i)=>({id:crypto.randomUUID(),name,amount:['300000','200000','150000'][i],note:'',share:['50','30','20'][i]}))};}
export function validate(p:Project){if(!p.name.trim())throw Error('项目名称不能为空');if(p.estimated&&p.estimated.length!==7)throw Error('预计成本必须有7项');for(const r of p.goods??[])if(!r.name.trim())throw Error('货物名称不能为空');for(const v of [...(p.estimated??[]),...p.costs.map(r=>r.paid??'0'),...(p.goods??[]).flatMap(r=>[r.quantity,r.amount]),p.weight,p.salesWeight,p.price,...p.costs.map(r=>r.amount),...p.investors.flatMap(r=>[r.amount,r.share])]){if(!/^\d+(\.\d{1,6})?$/.test(v)||d(v).gt('999999999999'))throw Error('请输入非负数字，最多6位小数且不超过999999999999');}for(const r of [...p.costs,...p.investors])if(!r.name.trim())throw Error('名称不能为空');if(p.investors.some(r=>d(r.share).gt(100)))throw Error('比例不能超过100%');}

export function investmentSummary(p:Project){
const estimated=(p.estimated??estimateLabels.map(()=>'0')).reduce((a,v)=>a.plus(v||0),d('0'));
const paid=p.costs.reduce((a,r)=>a.plus(r.paid||0),d('0'));
const goods=(p.goods??[]).reduce((a,r)=>a.plus(r.amount||0),d('0'));
const difference=estimated.minus(paid);
return {estimated,paid,goods,remaining:Decimal.max(difference,0),overrun:Decimal.max(difference.neg(),0),funded:difference.eq(0),progress:estimated.gt(0)?Decimal.min(paid.div(estimated).times(100),100).toNumber():paid.gt(0)?100:0};
}
