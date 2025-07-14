/* ---------------------------------------------------------------------------
   Adds monetary columns required by the Returns feature

   ‣ returns.total_refund         – overall refund amount for the return
   ‣ return_items.unit_price      – price per unit being refunded
   ‣ return_items.total_refund    – refund amount for the individual line-item
--------------------------------------------------------------------------- */

-- 1. total_refund on the return header
ALTER TABLE returns
  ADD COLUMN IF NOT EXISTS total_refund NUMERIC(12,2) DEFAULT 0;

-- 2. monetary columns on each return line-item
ALTER TABLE return_items
  ADD COLUMN IF NOT EXISTS unit_price   NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_refund NUMERIC(12,2) DEFAULT 0;

/* Optional: helpful indexes */
CREATE INDEX IF NOT EXISTS idx_returns_total_refund       ON returns(total_refund);
CREATE INDEX IF NOT EXISTS idx_return_items_total_refund  ON return_items(total_refund);
