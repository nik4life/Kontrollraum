import { db } from "../../../../lib/db";
import { json, requireModule } from "../../../../lib/http";
export async function PATCH(req:Request){
 const auth=await requireModule("BILLING","edit");if(!auth.user)return auth.response!;
 const b=await req.json().catch(()=>null);
 if(!b||typeof b!=="object")return json({error:"Ungültige Daten."},{status:400});
 const order=await db.order.findFirst({where:{id:String(b.orderId||""),companyId:auth.user.companyId},include:{items:true}});
 if(!order)return json({error:"Auftrag nicht gefunden."},{status:404});
 if(!["READY_FOR_REVIEW","COMPLETED"].includes(order.status))return json({error:"Nur Aufträge in der Rechnungsprüfung können korrigiert werden."},{status:409});
 if(!Array.isArray(b.items)||!b.items.length)return json({error:"Mindestens eine Position erforderlich."},{status:400});
 const rows=b.items.map((x:any)=>({id:String(x.id||""),description:String(x.description||"").trim(),quantity:Number(x.quantity),unit:String(x.unit||"Stk").trim(),unitPrice:Number(x.unitPrice),taxRate:Number(x.taxRate)}));
 if(rows.some((x:any)=>!order.items.some(y=>y.id===x.id)||!x.description||!x.unit||!Number.isFinite(x.quantity)||x.quantity<=0||!Number.isFinite(x.unitPrice)||x.unitPrice<0||!Number.isFinite(x.taxRate)||x.taxRate<0||x.taxRate>100))return json({error:"Ungültige Rechnungsposition."},{status:400});
 await db.$transaction(rows.map((x:any)=>db.orderItem.update({where:{id:x.id},data:{description:x.description,quantity:x.quantity,unit:x.unit,unitPrice:x.unitPrice,taxRate:x.taxRate}})));
 return json({ok:true});
}
