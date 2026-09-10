import { db } from "../../../../lib/db";
import { nextBusinessNumber } from "../../../../lib/business-number";
import { json, requireModule } from "../../../../lib/http";

const DEMO_CUSTOMERS = [
  { name: "Muster Elektrotechnik GmbH", contactPerson: "Anna Berger", street: "Industriestraße 12", zip: "77815", city: "Bühl", email: "anna.berger@example.test", phone: "07223 555100" },
  { name: "Familie Schneider", contactPerson: "Thomas Schneider", street: "Rheinstraße 7", zip: "77839", city: "Lichtenau", email: "schneider@example.test", phone: "07227 555210" },
  { name: "Bäckerei Morgenrot", contactPerson: "Lisa Weber", street: "Hauptstraße 41", zip: "77833", city: "Ottersweier", email: "info@morgenrot.example.test", phone: "07223 555330" },
  { name: "Hausverwaltung Rheinblick GmbH", contactPerson: "Markus Klein", street: "Bahnhofstraße 18", zip: "76532", city: "Baden-Baden", email: "technik@rheinblick.example.test", phone: "07221 555440" },
  { name: "Praxis Dr. Sommer", contactPerson: "Julia Sommer", street: "Lindenplatz 3", zip: "76437", city: "Rastatt", email: "praxis@example.test", phone: "07222 555550" },
  { name: "Autohaus West GmbH", contactPerson: "Daniel Roth", street: "Gewerbering 9", zip: "77855", city: "Achern", email: "service@autohaus-west.example.test", phone: "07841 555660" },
];

const DEMO_ITEMS = [
  { name: "NYM-J 3x1,5 mm²", description: "Installationsleitung", unit: "m", purchasePrice: 0.72, salesPrice: 1.45, itemType: "MATERIAL" },
  { name: "NYM-J 5x2,5 mm²", description: "Installationsleitung", unit: "m", purchasePrice: 1.85, salesPrice: 3.40, itemType: "MATERIAL" },
  { name: "Schuko-Steckdose UP", description: "Unterputz-Steckdose weiß", unit: "Stk", purchasePrice: 4.80, salesPrice: 11.90, itemType: "MATERIAL" },
  { name: "Lichtschalter UP", description: "Unterputz-Wechselschalter weiß", unit: "Stk", purchasePrice: 5.30, salesPrice: 12.50, itemType: "MATERIAL" },
  { name: "LS-Schalter B16A", description: "Leitungsschutzschalter 1-polig", unit: "Stk", purchasePrice: 5.90, salesPrice: 13.90, itemType: "MATERIAL" },
  { name: "FI/RCD 40A 30mA", description: "Fehlerstromschutzschalter 4-polig", unit: "Stk", purchasePrice: 31.50, salesPrice: 68.00, itemType: "MATERIAL" },
  { name: "Abzweigdose IP54", description: "Feuchtraum-Abzweigdose", unit: "Stk", purchasePrice: 2.20, salesPrice: 5.90, itemType: "MATERIAL" },
  { name: "Installationsrohr M20", description: "Kunststoffrohr", unit: "m", purchasePrice: 0.64, salesPrice: 1.55, itemType: "MATERIAL" },
  { name: "Monteurstunde", description: "Arbeitszeit Fachmonteur", unit: "Std", purchasePrice: null, salesPrice: 62.00, itemType: "LEISTUNG" },
  { name: "Meisterstunde", description: "Arbeitszeit Meister / Projektleitung", unit: "Std", purchasePrice: null, salesPrice: 78.00, itemType: "LEISTUNG" },
  { name: "Anfahrt Zone 1", description: "Anfahrt bis 20 km", unit: "pauschal", purchasePrice: null, salesPrice: 29.00, itemType: "LEISTUNG" },
  { name: "E-Check Kleinanlage", description: "Prüfung und Dokumentation einer Kleinanlage", unit: "pauschal", purchasePrice: null, salesPrice: 149.00, itemType: "LEISTUNG" },
];

export async function POST() {
  const auth = await requireModule("ADMIN", "create"); if (!auth.user) return auth.response!;
  const companyId = auth.user.companyId;

  const existingCustomers = await db.customer.count({ where: { companyId, notes: { contains: "KR_DEMO" } } });
  const existingItems = await db.catalogItem.count({ where: { companyId, source: "DEMO" } });
  let customersCreated = 0;
  let itemsCreated = 0;

  if (!existingCustomers) {
    for (const customer of DEMO_CUSTOMERS) {
      const number = await nextBusinessNumber(companyId, "CUSTOMER");
      await db.customer.create({ data: { companyId, number, ...customer, notes: "KR_DEMO – Testkunde", kind: customer.name.startsWith("Familie") ? "PRIVATE" : "COMPANY" } });
      customersCreated++;
    }
  }

  if (!existingItems) {
    for (const item of DEMO_ITEMS) {
      const sku = await nextBusinessNumber(companyId, "CATALOG");
      await db.catalogItem.create({ data: { companyId, sku, ...item, taxRate: 19, source: "DEMO" } });
      itemsCreated++;
    }
  }

  return json({ ok: true, customersCreated, itemsCreated, alreadyPresent: Boolean(existingCustomers || existingItems) });
}
