-- Returns table
CREATE TABLE returns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    order_number VARCHAR(100),
    return_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Accepted', 'Rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Return items table
CREATE TABLE return_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    return_id UUID REFERENCES returns(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    condition VARCHAR(20) DEFAULT 'Good' CHECK (condition IN ('Good', 'Used', 'Damaged', 'Defective')),
    reason VARCHAR(50) DEFAULT 'Defective' CHECK (reason IN ('Defective', 'Wrong Item', 'Not as Described', 'Changed Mind', 'Damaged in Transit', 'Quality Issues', 'Other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add return_id to inventory table to track returned items
ALTER TABLE inventory ADD COLUMN return_id UUID REFERENCES returns(id) ON DELETE SET NULL;

-- Indexes for returns
CREATE INDEX idx_returns_return_number ON returns(return_number);
CREATE INDEX idx_returns_customer_name ON returns(customer_name);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_return_date ON returns(return_date);
CREATE INDEX idx_return_items_return_id ON return_items(return_id);
CREATE INDEX idx_return_items_sku ON return_items(sku);
CREATE INDEX idx_inventory_return_id ON inventory(return_id);

-- Update trigger for returns
CREATE OR REPLACE FUNCTION update_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_returns_updated_at
    BEFORE UPDATE ON returns
    FOR EACH ROW
    EXECUTE FUNCTION update_returns_updated_at();
