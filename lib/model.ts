import Decimal from 'decimal.js';
Decimal.set({precision:40});
export type Row={id:string;name:string;amount:string;note:string;share:string;paid?:string;fundingPercent?:string};
export const estimateLabels=['采购费用','人工费','包装成本','运输成本','进口税','出口税','其他','进口清关费'] as const;
export type Goods={id:string;name:string;quantity:string;unit:string;amount:string;note:string;category?:string};
export type Payment={id:string;name:string;amount:string;status:'pending'|'paid';category?:string};
export type Project={id:string;name:string;product:string;weight:string;salesWeight:string;price:string;note:string;mode:string;costs:Row[];investors:Row[];estimated?:string[];goods?:Goods[];fundingMode?:boolean;payments?:Payment[]};
export const d=(v:string)=>new Decimal(v||0);
export function calculate(p:Project){p=applyFunding(p);const cost=p.costs.reduce((a,r)=>a.plus(r.amount||0),d('0'));const capital=p.investors.reduce((a,r)=>a.plus(r.amount||0),d('0'));const revenue=d(p.salesWeight).times(p.price||0);const profit=revenue.minus(cost);const total=p.investors.reduce((a,r)=>a.plus(r.share||0),d('0'));return {cost,capital,revenue,profit,total,unit:d(p.weight).gt(0)?cost.div(p.weight):null,breakeven:d(p.salesWeight).gt(0)?cost.div(p.salesWeight):null,margin:revenue.gt(0)?profit.div(revenue).times(100):null,valid:(!p.fundingMode||fundingAllocation(p).valid)&&p.investors.length>0&&(p.mode==='capital'?capital.gt(0):total.eq(100)),shares:p.investors.map(r=>p.mode==='capital'?(capital.gt(0)?d(r.amount).div(capital).times(100):d('0')):d(r.share))};}
export const blank=():Project=>({id:crypto.randomUUID(),name:'新项目',product:'',weight:'0',salesWeight:'0',price:'0',note:'',mode:'capital',costs:defaultCosts(),investors:[],fundingMode:true});
export function demo():Project{return {...blank(),fundingMode:false,name:'委内瑞拉带鱼',product:'带鱼',weight:'26000',salesWeight:'26000',price:'32',costs:['鱼货成本','加工及冷冻','包装','海运及物流','税费及清关'].map((name,i)=>({id:crypto.randomUUID(),name,amount:['400000','65000','15000','70000','100000'][i],note:'虚构演示',share:'0'})),investors:['A','B','C'].map((name,i)=>({id:crypto.randomUUID(),name,amount:['300000','200000','150000'][i],note:'',share:['50','30','20'][i]}))};}
export function validate(p:Project){if(!p.name.trim())throw Error('项目名称不能为空');if(p.estimated&&![7,8].includes(p.estimated.length))throw Error('预计成本必须有8项（兼容旧7项）');for(const r of p.goods??[])if(!r.name.trim())throw Error('货物名称不能为空');for(const r of p.payments??[])if(!r.name.trim()||!['pending','paid'].includes(r.status))throw Error('投入记录名称或状态无效');for(const v of [...(p.payments??[]).map(r=>r.amount),...(p.estimated??[]),...p.costs.map(r=>r.paid??'0'),...(p.goods??[]).flatMap(r=>[r.quantity,r.amount]),p.weight,p.salesWeight,p.price,...p.costs.map(r=>r.amount),...p.investors.flatMap(r=>[r.amount,r.share,...(r.fundingPercent===undefined?[]:[r.fundingPercent])])]){if(!/^\d+(\.\d{1,6})?$/.test(v)||d(v).gt('999999999999'))throw Error('请输入非负数字，最多6位小数且不超过999999999999');}for(const r of [...p.costs,...p.investors])if(!r.name.trim())throw Error('名称不能为空');if(p.investors.some(r=>d(r.share).gt(100)||d(r.fundingPercent??'0').gt(100)))throw Error('比例不能超过100%');}

export function investmentSummary(p:Project){
const estimated=(p.estimated??estimateLabels.map(()=>'0')).reduce((a,v)=>a.plus(v||0),d('0'));
const paid=p.costs.reduce((a,r)=>a.plus(r.paid||0),d('0')).plus((p.payments??[]).filter(r=>r.status==='paid').reduce((a,r)=>a.plus(r.amount||0),d('0')));
const pending=(p.payments??[]).filter(r=>r.status==='pending').reduce((a,r)=>a.plus(r.amount||0),d('0'));
const goods=(p.goods??[]).reduce((a,r)=>a.plus(r.amount||0),d('0'));
const actualPaid=paid.plus(goods);
const difference=estimated.minus(actualPaid);
return {estimated,paid:actualPaid,pending,goods,remaining:Decimal.max(difference,0),overrun:Decimal.max(difference.neg(),0),funded:difference.eq(0),progress:estimated.gt(0)?Decimal.min(actualPaid.div(estimated).times(100),100).toNumber():actualPaid.gt(0)?100:0};
}

export function fundingAllocation(p:Project){
const capital=p.investors.reduce((a,r)=>a.plus(r.amount||0),d('0'));
const percentages=p.investors.map(r=>r.fundingPercent!==undefined?d(r.fundingPercent):capital.gt(0)?d(r.amount).div(capital).times(100).toDecimalPlaces(6):d('0'));
if(p.investors.every(r=>r.fundingPercent===undefined)&&capital.gt(0)&&percentages.length)percentages[percentages.length-1]=d('100').minus(percentages.slice(0,-1).reduce((a,v)=>a.plus(v),d('0')));
const total=percentages.reduce((a,v)=>a.plus(v),d('0'));
const valid=percentages.length>0&&total.eq(100)&&percentages.every(v=>v.gte(0)&&v.lte(100));
const budget=investmentSummary(p).estimated.toDecimalPlaces(2,Decimal.ROUND_HALF_UP);
let used=d('0');
const amounts=percentages.map((v,i)=>{const amount=valid&&i===percentages.length-1?budget.minus(used):budget.times(v).div(100).toDecimalPlaces(2,Decimal.ROUND_DOWN);used=used.plus(amount);return amount;});
return {percentages,total,valid,budget,amounts,message:valid?'资金比例有效':'资金比例合计 '+total.toFixed(6)+'%，必须为100%'};
}
export function applyFunding(p:Project):Project{if(!p.fundingMode)return p;const f=fundingAllocation(p);return {...p,investors:p.investors.map((r,i)=>({...r,fundingPercent:f.percentages[i].toString(),amount:f.amounts[i].toFixed(2)}))};}

export function estimatedValues(p:Project){return estimateLabels.map((_,i)=>p.estimated?.[i]??'0');}
export function defaultCosts():Row[]{return estimateLabels.map(name=>({id:crypto.randomUUID(),name,amount:'0',paid:'0',note:'',share:'0'}));}
export function completeCosts(p:Project):Row[]{return [...p.costs,...defaultCosts().filter(r=>!p.costs.some(x=>x.name===r.name))];}

// 保持旧数组索引稳定，界面单独调整顺序。
export const categoryOrder=[0,1,2,3,4,5,7,6];
export function paidByCategory(p:Project){const values=estimateLabels.map(()=>d('0'));for(const r of p.payments??[]){if(r.status==='paid'){const i=estimateLabels.indexOf(categoryName(r.category) as typeof estimateLabels[number]);values[i<0?6:i]=values[i<0?6:i].plus(r.amount||0);}}for(const r of p.goods??[]){const i=estimateLabels.indexOf(categoryName(r.category) as typeof estimateLabels[number]);values[i<0?6:i]=values[i<0?6:i].plus(r.amount||0);}for(const r of p.costs){const i=estimateLabels.indexOf(categoryName(r.name) as typeof estimateLabels[number]);values[i<0?6:i]=values[i<0?6:i].plus(r.paid||0);}return values;}

export function categoryName(value?:string){return value==='采购成本'?'采购费用':value==='进口费'?'进口清关费':value??'其他';}
export function chartParts(values:string[]){const amounts=values.map(v=>d(v));const total=amounts.reduce((a,v)=>a.plus(v),d('0'));return amounts.map(v=>total.gt(0)?v.div(total).times(100):d('0'));}

export function organizeInputs(p:Project):Project{const paid=(p.payments??[]).filter(r=>r.status==='paid');if(!paid.length)return p;return {...p,goods:[...(p.goods??[]),...paid.map(r=>({id:r.id,name:r.name,category:categoryName(r.category),quantity:'0',unit:'',amount:r.amount,note:r.name}))],payments:(p.payments??[]).filter(r=>r.status!=='paid')};}
