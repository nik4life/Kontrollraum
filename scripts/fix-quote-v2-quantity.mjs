import fs from "node:fs";

const path = "app/quote-workspace.tsx";
let s = fs.readFileSync(path, "utf8");
const before = s;

s = s.replace(
`  function addCatalogPosition(id: string) {
    const item = catalog.find(x => x.id === id); if (!item) return;
    setPositions(p => [...p, newPosition(item)]); setSaveState("dirty");
  }`,
`  function addCatalogPosition(id: string, quantity = 1) {
    const item = catalog.find(x => x.id === id); if (!item) return;
    const position = newPosition(item);
    position.quantity = Math.max(0.001, quantity);
    setPositions(p => [...p, position]); setSaveState("dirty");
  }`
);

s = s.replace(
`onAdd:(id:string)=>void;onUpdate:(key:string,patch:Partial<QuotePosition>)=>void;onRemove:(key:string)=>void`,
`onAdd:(id:string,quantity?:number)=>void;onUpdate:(key:string,patch:Partial<QuotePosition>)=>void;onRemove:(key:string)=>void`
);

s = s.replace(
`function add(item:Row){for(let i=0;i<Math.max(1,qty);i++) onAdd(item.id); setSearch("");setQty(1)}`,
`function add(item:Row){onAdd(item.id, Math.max(0.001, qty)); setSearch("");setQty(1)}`
);

if (s === before) {
  console.log("No quote quantity patch needed.");
} else {
  fs.writeFileSync(path, s);
  console.log("Patched quote quantity handling.");
}
