import { db } from "../../../../lib/db";
import { json, requireModule } from "../../../../lib/http";
const fields = ["name","kind","contactPerson","street","zip","city","email","phone","vatId","notes"] as const;
export async function PATCH(req: Request,{params}:{params:Promise<{id:string}>}) {
 const auth=await requireModule("CUSTOMERS","edit");if(!auth.user)return auth.response!;
 const {id}=await params;const body=await req.json().catch(()=>null);
 if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"Ungültige Daten."},{status:400});
 const data:Record<string,string|null>={};
 for(const key of fields)if(Object.prototype.hasOwnProperty.call(body,key)){if(typeof body[key]!=="string")return json({error:"Ungültiges Feld: "+key},{status:400});const v=body[key].trim();if(v.length>2000)return json({error:"Feld zu lang: "+key},{status:400});data[key]=v||null;}
 if(data.name===null)return json({error:"Kundenname fehlt."},{status:400});
 if(data.zip&&!/^[0-9]{5}$/.test(data.zip))return json({error:"PLZ muss fünf Ziffern haben."},{status:400});
 if(data.kind&&!["COMPANY","PRIVATE"].includes(data.kind))return json({error:"Ungültiger Kundentyp."},{status:400});
 const updated=await db.customer.updateMany({where:{id,companyId:auth.user.companyId},data});
 if(!updated.count)return json({error:"Kunde nicht gefunden."},{status:404});
 return json(await db.customer.findFirst({where:{id,companyId:auth.user.companyId}}));
}
