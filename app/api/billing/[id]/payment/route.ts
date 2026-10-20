import { db } from "../../../../../lib/db";
import { json, requireModule } from "../../../../../lib/http";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireModule("BILLING","edit");if(!auth.user)return auth.response!;
 const {id}=await params;const body=await req.json().catch(()=>null);
 if(typeof body?.paid!=="boolean")return json({error:"Zahlungsstatus muss angegeben werden."},{status:400});
 const invoice=await db.invoice.findFirst({where:{id,companyId:auth.user.companyId}});
 if(!invoice)return json({error:"Rechnung nicht gefunden."},{status:404});
 if(invoice.status==="CANCELLED")return json({error:"Stornierte Rechnungen können nicht als bezahlt markiert werden."},{status:409});
 const paid=body.paid;
 const updated=await db.invoice.update({where:{id},data:{status:paid?"PAID":"SENT",paidAt:paid?new Date():null}});
 return json(updated);
}
