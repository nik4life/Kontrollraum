import fs from "node:fs";

const path = "app/v2-client.tsx";
let s = fs.readFileSync(path, "utf8");
const before = s;

if (!s.includes('import QuoteWorkspace from "./quote-workspace";')) {
  s = s.replace(
    'import BillingWorkspace from "./billing-workspace";',
    'import BillingWorkspace from "./billing-workspace";\nimport QuoteWorkspace from "./quote-workspace";'
  );
}

s = s.replace(
  '{view==="dashboard"&&<Dashboard setView={setView}/>} {view==="quotes"&&<Quotes setView={setView}/>} {view==="orders"&&<Orders/>}',
  '{view==="dashboard"&&<Dashboard setView={setView}/>} {view==="quotes"&&<QuoteWorkspace setView={setView}/>} {view==="orders"&&<Orders/>}'
);

if (s === before) {
  console.log("No wiring change needed.");
} else {
  fs.writeFileSync(path, s);
  console.log("QuoteWorkspace wired into V2Client.");
}
