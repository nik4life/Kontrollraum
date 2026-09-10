ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PREPARATION';

CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT','SENT','ACCEPTED','REJECTED','ARCHIVED','CONVERTED');
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT','READY_FOR_REVIEW','APPROVED','INVOICED','ARCHIVED');
CREATE TYPE "AbsenceType" AS ENUM ('VACATION','SICK','TRAINING','TIME_OFF','OTHER');

ALTER TABLE "orders" ADD COLUMN "scheduled_end_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "planned_minutes" INTEGER;

CREATE TABLE "quotes" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "order_id" TEXT,
  "number" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "valid_until" DATE,
  "sent_at" TIMESTAMP(3),
  "responded_at" TIMESTAMP(3),
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "net_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "gross_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quotes_company_id_number_version_key" ON "quotes"("company_id","number","version");
CREATE UNIQUE INDEX "quotes_order_id_key" ON "quotes"("order_id");

CREATE TABLE "quote_items" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "quote_id" TEXT NOT NULL,
  "catalog_item_id" TEXT,
  "position" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'Stk',
  "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 19,
  CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reports" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
  "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "work_minutes" INTEGER NOT NULL DEFAULT 0,
  "hourly_rate" DECIMAL(12,2),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reports_company_id_number_key" ON "reports"("company_id","number");

CREATE TABLE "report_items" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "report_id" TEXT NOT NULL,
  "catalog_item_id" TEXT,
  "position" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'Stk',
  "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 19,
  CONSTRAINT "report_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_assignments" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "order_assignments_order_id_user_id_starts_at_key" ON "order_assignments"("order_id","user_id","starts_at");
CREATE INDEX "order_assignments_company_id_starts_at_ends_at_idx" ON "order_assignments"("company_id","starts_at","ends_at");

CREATE TABLE "absences" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "AbsenceType" NOT NULL DEFAULT 'OTHER',
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "absences_company_id_starts_at_ends_at_idx" ON "absences"("company_id","starts_at","ends_at");

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "report_items" ADD CONSTRAINT "report_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_items" ADD CONSTRAINT "report_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_assignments" ADD CONSTRAINT "order_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_assignments" ADD CONSTRAINT "order_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_assignments" ADD CONSTRAINT "order_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "absences" ADD CONSTRAINT "absences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "absences" ADD CONSTRAINT "absences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD COLUMN "report_id" TEXT;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "invoices_report_id_idx" ON "invoices"("report_id");

INSERT INTO "modules" ("code","label","description","sort_order") VALUES
('QUOTES','Angebote','Angebote erstellen, versenden und in Aufträge überführen',35),
('PLANNING','Kalender','Mitarbeiter, Einsätze und Abwesenheiten planen',45),
('REPORTS','Rapporte','Direkte Leistungsrapporte ohne vorherigen Auftrag',65)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_modules" ("role_id","module_code","can_view","can_create","can_edit","can_delete")
SELECT r."id", m."code", true, true, true, true
FROM "roles" r
CROSS JOIN "modules" m
WHERE r."system_role" = true AND m."code" IN ('QUOTES','PLANNING','REPORTS')
ON CONFLICT ("role_id","module_code") DO NOTHING;
