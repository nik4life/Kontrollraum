ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_discount_percent DECIMAL(5,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_discount_days INTEGER;
