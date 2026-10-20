-- Optional discounts for catalog items, quotes and invoices.
ALTER TABLE catalog_items ADD COLUMN discount_eligible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE quotes ADD COLUMN cash_discount_percent DECIMAL(5,2), ADD COLUMN cash_discount_days INTEGER;
ALTER TABLE invoices ADD COLUMN cash_discount_percent DECIMAL(5,2), ADD COLUMN cash_discount_days INTEGER;
ALTER TABLE quote_items ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'PERCENT', ADD COLUMN discount_value DECIMAL(12,2) NOT NULL DEFAULT 0, ADD COLUMN discount_eligible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE invoice_items ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'PERCENT', ADD COLUMN discount_value DECIMAL(12,2) NOT NULL DEFAULT 0, ADD COLUMN discount_eligible BOOLEAN NOT NULL DEFAULT TRUE;
