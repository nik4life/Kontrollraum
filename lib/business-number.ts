import { db } from "./db";

type SequenceKind = "CUSTOMER" | "CATALOG" | "ORDER" | "INVOICE";

const PREFIX: Record<SequenceKind, string> = {
  CUSTOMER: "KD",
  CATALOG: "AR",
  ORDER: "AU",
  INVOICE: "RE",
};

export async function nextBusinessNumber(companyId: string, kind: SequenceKind) {
  const year = new Date().getFullYear();
  const yearly = kind === "ORDER" || kind === "INVOICE";
  const sequenceKey = yearly ? `${kind}_${year}` : kind;

  const rows = await db.$queryRaw<Array<{ current_value: number }>>`
    INSERT INTO "number_sequences" ("company_id", "sequence_key", "current_value")
    VALUES (${companyId}, ${sequenceKey}, 1)
    ON CONFLICT ("company_id", "sequence_key")
    DO UPDATE SET "current_value" = "number_sequences"."current_value" + 1
    RETURNING "current_value"
  `;

  const value = rows[0]?.current_value;
  if (!value) throw new Error(`Nummernkreis ${sequenceKey} konnte nicht erhöht werden.`);

  const suffix = String(value).padStart(kind === "CUSTOMER" || kind === "CATALOG" ? 5 : 4, "0");
  return yearly ? `${PREFIX[kind]}-${year}-${suffix}` : `${PREFIX[kind]}-${suffix}`;
}
