import {categoryOrder,estimateLabels,chartParts,d} from '../lib/model';
const colors=['#147d73','#438ac7','#dfaa3c','#a66bb4','#df795a','#6aa77c','#6574ae','#929da5'];
export default function CostPie({title,values}:{title:string;values:string[]}){
const parts=chartParts(values);const total=values.reduce((a,v)=>a.plus(v||0),d('0'));let position=0;const stops=categoryOrder.map((i,j)=>{const start=position;position+=parts[i].toNumber();return `${colors[j]} ${start}% ${position}%`;});
return <figure className="cost-chart"><figcaption>{title}</figcaption>{total.gt(0)?<div className="pie-layout"><div role="img" aria-label={title+'，各费用比例详见图例'} className="pie" style={{background:`conic-gradient(${stops.join(',')})`}}/><ul>{categoryOrder.map((i,j)=><li key={i}><span className="pie-key" style={{background:colors[j]}}/>{estimateLabels[i]}：¥{d(values[i]).toFixed(2)} · {parts[i].toFixed(2)}%</li>)}</ul></div>:<p>暂无数据</p>}</figure>;
}
