-- Business-facing numbers are allocated per company and sequence key.
-- This is separate from Prisma's internal CUID primary keys.
CREATE TABLE "number_sequences" (
  "company_id" TEXT NOT NULL,
  "sequence_key" TEXT NOT NULL,
  "current_value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "number_sequences_pkey" PRIMARY KEY ("company_id", "sequence_key"),
  CONSTRAINT "number_sequences_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
