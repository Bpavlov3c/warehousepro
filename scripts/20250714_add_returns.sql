-- ------------------------------------------------------------------
-- Add Returns support (safe to run multiple times)
-- ------------------------------------------------------------------

-- Enable pgcrypto for gen_random_uuid if it hasn't been enabled yet
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== main “returns” header ==========
CREATE TABLE IF NOT EXISTS public.returns (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255)      NOT NULL,
    customer_email VARCHAR(255),
    order_number  VARCHAR(100),
    return_date   DATE             NOT NULL,
    status        VARCHAR(20)      NOT NULL DEFAULT 'Pending'
                 CHECK (status IN ('Pending','Processing','Accepted','Rejected')),
    notes         TEXT,
    created_at    TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- ensure updated_at stays fresh
CREATE OR REPLACE FUNCTION public.set_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_returns_updated_at ON public.returns;
CREATE TRIGGER trg_returns_updated_at
BEFORE UPDATE ON public.returns
FOR EACH ROW EXECUTE FUNCTION public.set_returns_updated_at();

-- ========== line-items ==========
CREATE TABLE IF NOT EXISTS public.return_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id   UUID REFERENCES public.returns(id) ON DELETE CASCADE,
    sku         VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity    INTEGER      NOT NULL CHECK (quantity > 0),
    condition   VARCHAR(20)  NOT NULL DEFAULT 'Good'
               CHECK (condition IN ('Good','Used','Damaged','Defective')),
    reason      VARCHAR(50)  NOT NULL DEFAULT 'Defective'
               CHECK (reason IN (
                  'Defective','Wrong Item','Not as Described',
                  'Changed Mind','Damaged in Transit','Quality Issues','Other'
               )),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ========== optional: track which inventory rows came from returns ==========
ALTER TABLE IF NOT EXISTS public.inventory
ADD COLUMN IF NOT EXISTS return_id UUID REFERENCES public.returns(id) ON DELETE SET NULL;

-- helpful indexes
CREATE INDEX IF NOT EXISTS idx_returns_status       ON public.returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_return_date  ON public.returns(return_date);
CREATE INDEX IF NOT EXISTS idx_return_items_return  ON public.return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_sku     ON public.return_items(sku);
