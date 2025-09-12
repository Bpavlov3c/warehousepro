-- Create API Keys table for Open API integration
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES shopify_stores(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '{"inventory": true, "orders": true}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast API key lookups
CREATE INDEX idx_api_keys_key ON api_keys(api_key);
CREATE INDEX idx_api_keys_store_id ON api_keys(store_id);

-- Add Open API store type support
ALTER TABLE shopify_stores 
ADD COLUMN store_type VARCHAR(50) DEFAULT 'shopify',
ADD COLUMN api_endpoint VARCHAR(500);

-- Update existing stores to be 'shopify' type
UPDATE shopify_stores SET store_type = 'shopify' WHERE store_type IS NULL;
