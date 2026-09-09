CREATE TYPE "OrderStatus" AS ENUM ('DRAFT','PLANNED','IN_PROGRESS','READY_FOR_REVIEW','COMPLETED','INVOICED','CANCELLED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT','REVIEW','APPROVED','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED');

CREATE TABLE "companies" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "legal_name" TEXT,
  "street" TEXT,
  "zip" TEXT,
  "city" TEXT,
  "country" TEXT NOT NULL DEFAULT 'DE',
  "email" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "tax_number" TEXT,
  "vat_id" TEXT,
  "iban" TEXT,
  "bic" TEXT,
  "invoice_prefix" TEXT NOT NULL DEFAULT 'RE',
  "quote_prefix" TEXT NOT NULL DEFAULT 'AN',
  "order_prefix" TEXT NOT NULL DEFAULT 'AU',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

CREATE TABLE "modules" (
  "code" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "roles" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "system_role" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "roles_company_id_code_key" ON "roles"("company_id","code");

CREATE TABLE "role_modules" (
  "role_id" TEXT NOT NULL,
  "module_code" TEXT NOT NULL,
  "can_view" BOOLEAN NOT NULL DEFAULT true,
  "can_create" BOOLEAN NOT NULL DEFAULT false,
  "can_edit" BOOLEAN NOT NULL DEFAULT false,
  "can_delete" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("role_id","module_code"),
  CONSTRAINT "role_modules_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
  CONSTRAINT "role_modules_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "modules"("code") ON DELETE CASCADE
);

CREATE TABLE "user_roles" (
  "user_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  PRIMARY KEY ("user_id","role_id"),
  CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
);

CREATE TABLE "customers" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "number" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'COMPANY',
  "name" TEXT NOT NULL,
  "contact_person" TEXT,
  "street" TEXT,
  "zip" TEXT,
  "city" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "vat_id" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "customers_company_id_number_key" ON "customers"("company_id","number");

CREATE TABLE "suppliers" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "customer_number" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE TABLE "catalog_items" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "supplier_id" TEXT,
  "sku" TEXT,
  "ean" TEXT,
  "manufacturer" TEXT,
  "manufacturer_sku" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "item_type" TEXT NOT NULL DEFAULT 'MATERIAL',
  "unit" TEXT NOT NULL DEFAULT 'Stk',
  "purchase_price" DECIMAL(12,2),
  "sales_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 19,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalog_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "catalog_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "catalog_items_company_id_sku_key" ON "catalog_items"("company_id","sku");

CREATE TABLE "price_lists" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "price_lists_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "price_lists_company_id_code_key" ON "price_lists"("company_id","code");

CREATE TABLE "catalog_prices" (
  "item_id" TEXT NOT NULL,
  "price_list_id" TEXT NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  PRIMARY KEY ("item_id","price_list_id"),
  CONSTRAINT "catalog_prices_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE,
  CONSTRAINT "catalog_prices_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE
);

CREATE TABLE "import_jobs" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "file_name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DONE',
  "rows_total" INTEGER NOT NULL DEFAULT 0,
  "rows_imported" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE TABLE "orders" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
  "street" TEXT,
  "zip" TEXT,
  "city" TEXT,
  "scheduled_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
);
CREATE UNIQUE INDEX "orders_company_id_number_key" ON "orders"("company_id","number");

CREATE TABLE "order_items" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "catalog_item_id" TEXT,
  "position" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'Stk',
  "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 19,
  CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
  CONSTRAINT "order_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL
);

CREATE TABLE "time_entries" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "user_id" TEXT,
  "started_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "minutes" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "billable" BOOLEAN NOT NULL DEFAULT true,
  "hourly_rate" DECIMAL(12,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "time_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
  CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE "material_usages" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "catalog_item_id" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'Stk',
  "unit_price" DECIMAL(12,2),
  "billable" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "material_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
  CONSTRAINT "material_usages_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL
);

CREATE TABLE "extra_work" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "extra_work_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
);

CREATE TABLE "order_notes" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "user_id" TEXT,
  "note" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
  CONSTRAINT "order_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE "invoices" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "order_id" TEXT,
  "number" TEXT,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "net_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "gross_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "due_at" DATE,
  "sent_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id"),
  CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "invoices_company_id_number_key" ON "invoices"("company_id","number");

CREATE TABLE "invoice_items" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'Stk',
  "unit_price" DECIMAL(12,2) NOT NULL,
  "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 19,
  CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE
);

INSERT INTO "modules" ("code","label","description","sort_order") VALUES
('DASHBOARD','Heute','Aufgaben und Überblick',10),
('CUSTOMERS','Kunden','Kunden und Kontakte',20),
('CATALOG','Artikel','Artikel und Leistungen',30),
('ORDERS','Aufträge','Aufträge und Projekte',40),
('TIME','Zeiten','Arbeitszeiterfassung',50),
('MATERIAL','Material','Materialverbrauch',60),
('DOCUMENTATION','Dokumentation','Notizen, Fotos und Nachträge',70),
('BILLING','Abrechnung','Rechnungen und Freigaben',80),
('FINANCE','Finanzen','Offene Posten und Bank',90),
('ADMIN','Verwaltung','Unternehmen, Benutzer und Rollen',100);
