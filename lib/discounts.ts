export type DiscountLine = {quantity:number;unitPrice:number;taxRate:number;discountType?:string;discountValue?:number;discountEligible?:boolean};
export function roundMoney(n:number){return Math.round((n+Number.EPSILON)*100)/100}
export function lineNet(x:DiscountLine){
 const gross=roundMoney(Number(x.quantity)*Number(x.unitPrice));
 const value=Number(x.discountValue||0);
 const discount=x.discountType==="AMOUNT"?value:roundMoney(gross*value/100);
 return roundMoney(gross-Math.min(gross,discount));
}
export function validateLines(lines:DiscountLine[]){
 for(const x of lines){
  if(!Number.isFinite(Number(x.quantity))||Number(x.quantity)<=0||!Number.isFinite(Number(x.unitPrice))||Number(x.unitPrice)<0)throw Error("Ungültige Menge oder Preis.");
  if(!Number.isFinite(Number(x.taxRate))||Number(x.taxRate)<0||Number(x.taxRate)>100)throw Error("Ungültiger Steuersatz.");
  if(x.discountType&&!["PERCENT","AMOUNT"].includes(x.discountType))throw Error("Ungültiger Rabatttyp.");
  const v=Number(x.discountValue||0);
  if(!Number.isFinite(v)||v<0||(x.discountType!=="AMOUNT"&&v>100)||(x.discountType==="AMOUNT"&&v>roundMoney(Number(x.quantity)*Number(x.unitPrice))))throw Error("Ungültiger Positionsrabatt.");
 }
}
export function totals(lines:DiscountLine[],cashPercent=0){
 const net=roundMoney(lines.reduce((s,x)=>s+lineNet(x),0));
 const tax=roundMoney(lines.reduce((s,x)=>s+roundMoney(lineNet(x)*Number(x.taxRate)/100),0));
 const eligibleGross=roundMoney(lines.filter(x=>x.discountEligible!==false).reduce((s,x)=>s+lineNet(x)+roundMoney(lineNet(x)*Number(x.taxRate)/100),0));
 const cashDiscount=roundMoney(eligibleGross*cashPercent/100);
 return {net,tax,gross:roundMoney(net+tax),eligibleGross,cashDiscount,promptPay:roundMoney(net+tax-cashDiscount)};
}
export function validateCashTerms(percent:unknown,days:unknown){
 const p=Number(percent||0),d=Number(days||0);
 if(!Number.isFinite(p)||p<0||p>100||!Number.isInteger(d)||d<0||d>365||((p===0)!==(d===0)))throw Error("Skonto erfordert einen Prozentsatz und eine Frist von 1 bis 365 Tagen.");
 return {percent:p||null,days:d||null};
}
