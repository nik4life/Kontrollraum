import { db } from "../../../../lib/db";
import { json, requireModule } from "../../../../lib/http";
const textFields=["name","description","unit","ean","manufacturer","manufacturerSku"] as const;
const priceFields=["purchasePrice","salesPrice","taxRate"] as const;
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireModule("CATALOG","edit");if(!auth.user)return auth.response!;
 const {id}=await params;const body=await req.json().catch(()=>null);
 if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"Ungültige Daten."},{status:400});
 const data:Record<string,string|number|boolean|null>={};
 for(const k of textFields)if(Object.prototype.hasOwnProperty.call(body,k)){if(typeof body[k]!=="string")return json({error:"Ungültiges Feld: "+k},{status:400});const v=body[k].trim();if(v.length>4000)return json({error:"Feld zu lang: "+k},{status:400});data[k]=v||null;}
 if(data.name===null||data.unit===null)return json({error:"Name und Einheit sind erforderlich."},{status:400});
 if(body.itemType!==undefined){if(!["MATERIAL","LEISTUNG"].includes(body.itemType))return json({error:"Ungültiger Typ."},{status:400});data.itemType=body.itemType;}
 for(const k of priceFields)if(Object.prototype.hasOwnProperty.call(body,k)){if(body[k]===null&&k==="purchasePrice"){data[k]=null;continue}const v=Number(body[k]);if(!Number.isFinite(v)||v<0||v>100000000||(k==="taxRate"&&v>100))return json({error:"Ungültiger Zahlenwert: "+k},{status:400});data[k]=v;}
 if(body.discountEligible!==undefined){if(typeof body.discountEligible!=="boolean")return json({error:"Ungültige Skontofähigkeit."},{status:400});data.discountEligible=body.discountEligible;}
 const updated=await db.catalogItem.updateMany({where:{id,companyId:auth.user.companyId},data});
 if(!updated.count)return json({error:"Artikel nicht gefunden."},{status:404});
 return json(await db.catalogItem.findFirst({where:{id,companyId:auth.user.companyId}}));
}
