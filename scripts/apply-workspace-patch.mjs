import fs from "node:fs";

const path = "app/v2-client.tsx";
let s = fs.readFileSync(path, "utf8");
const importNeedle = 'import { CalendarDays, Check, ChevronRight, ClipboardCheck, ClipboardList, FileText, FileUp, Gauge, Home, LogOut, MoreHorizontal, Package, Plus, ReceiptText, Settings, ShieldCheck, Trash2, UsersRound, Wrench } from "lucide-react";';
const importReplacement = importNeedle + '\nimport PlanningWorkspace from "./planning-workspace";\nimport BillingWorkspace from "./billing-workspace";';
if (!s.includes(importNeedle)) throw new Error("Import marker not found");
s = s.replace(importNeedle, importReplacement);
const renderNeedle = '{view==="dashboard"&&<Dashboard setView={setView}/>} {view==="quotes"&&<Quotes setView={setView}/>} {view==="orders"&&<Orders/>} {view==="planning"&&<Planning/>} {view==="reports"&&<Reports/>} {view==="billing"&&<Billing user={user}/>} {view==="customers"&&<Customers/>} {view==="catalog"&&<Catalog/>} {view==="admin"&&<Admin onChanged={boot}/>} {view==="more"&&<More setView={setView}/>}';
const renderReplacement = '{view==="dashboard"&&<Dashboard setView={setView}/>} {view==="quotes"&&<Quotes setView={setView}/>} {view==="orders"&&<Orders/>} {view==="planning"&&<PlanningWorkspace/>} {view==="reports"&&<Reports/>} {view==="billing"&&<BillingWorkspace user={user}/>} {view==="customers"&&<Customers/>} {view==="catalog"&&<Catalog/>} {view==="admin"&&<Admin onChanged={boot}/>} {view==="more"&&<More setView={setView}/>}';
if (!s.includes(renderNeedle)) throw new Error("Render marker not found");
s = s.replace(renderNeedle, renderReplacement);
fs.writeFileSync(path, s);
console.log("Integrated planning and billing workspaces");
