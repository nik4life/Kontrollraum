import { db } from "../../../../lib/db";
import { json, requireModule } from "../../../../lib/http";
import { validateCashTerms, validateLines } from "../../../../lib/discounts";

async function reviewOrder(orderId:string,companyId:string){
 return db.order.findFirst({where:{id:orderId,companyId,status:{in:["READY_FOR_REVIEW","COMPLETED"]}},include:{items:true,invoices:true}});
}
export async function POST(req:Request){
 const auth=await requireModule("BILLING","edit");if(!auth.user)return auth.response!;
 const b=await req.json().catch(()=>null);
 const order=await reviewOrder(String(b?.orderId||""),auth.user.companyId);
 if(!order)return json({error:"Auftrag nicht in der Rechnungsprüfung."},{status:404});
 if(order.invoices.some(x=>x.status!=="CANCELLED"))return json({error:"Es existiert bereits eine Rechnung."},{status:409});
 const catalog=await db.catalogItem.findFirst({where:{id:String(b?.catalogItemId||""),companyId:auth.user.companyId,active:true}});
 if(!catalog)return json({error:"Artikel oder Leistung nicht im Katalog gefunden."},{status:404});
 const quantity=Number(b.quantity);
 if(!Number.isFinite(quantity)||quantity<=0||quantity>1000000)return json({error:"Ungültige Menge."},{status:400});
 const last=Math.max(0,...order.items.map(x=>x.position));
 const created=await db.orderItem.create({data:{companyId:auth.user.companyId,orderId:order.id,position:last+1,catalogItemId:catalog.id,description:catalog.name,quantity,unit:catalog.unit,unitPrice:catalog.salesPrice,taxRate:catalog.taxRate,discountEligible:catalog.discountEligible}});
 return json(created,{status:201});
}
export async function PATCH(req:Request){
 const auth=await requireModule("BILLING","edit");if(!auth.user)return auth.response!;
 const b=await req.json().catch(()=>null);
 const order=await reviewOrder(String(b?.orderId||""),auth.user.companyId);
 if(!order)return json({error:"Auftrag nicht in der Rechnungsprüfung."},{status:404});
 if(order.invoices.some(x=>x.status!=="CANCELLED"))return json({error:"Eine bestehende Rechnung kann hier nicht verändert werden."},{status:409});
 if(b.cashDiscountPercent!==undefined||b.cashDiscountDays!==undefined){
  try{const terms=validateCashTerms(b.cashDiscountPercent,b.cashDiscountDays);await db.order.update({where:{id:order.id},data:{cashDiscountPercent:terms.percent,cashDiscountDays:terms.days}})}catch(e:any){return json({error:e.message},{status:400})}
 }
 if(!Array.isArray(b.items)||!b.items.length)return json({error:"Mindestens eine Position erforderlich."},{status:400});
 const rows=b.items.map((x:any)=>({id:String(x.id||""),description:String(x.description||"").trim(),quantity:Number(x.quantity),unit:String(x.unit||"Stk").trim(),unitPrice:Number(x.unitPrice),taxRate:Number(x.taxRate),discountType:x.discountType==="AMOUNT"?"AMOUNT":"PERCENT",discountValue:Number(x.discountValue||0),discountEligible:x.discountEligible!==false}));
 if(rows.some((x:any)=>!order.items.some(y=>y.id===x.id)||!x.description||x.description.length>2000||!x.unit||x.unit.length>30))return json({error:"Ungültige Rechnungsposition."},{status:400});
 try{validateLines(rows)}catch(e:any){return json({error:e.message},{status:400})}
 await db.$transaction(rows.map((x:any)=>db.orderItem.update({where:{id:x.id},data:{description:x.description,quantity:x.quantity,unit:x.unit,unitPrice:x.unitPrice,taxRate:x.taxRate,discountType:x.discountType,discountValue:x.discountValue,discountEligible:x.discountEligible}})));
 return json({ok:true});
}
