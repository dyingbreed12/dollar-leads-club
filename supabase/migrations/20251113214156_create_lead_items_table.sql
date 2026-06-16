create table if not exists lead_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Core Fields
    title TEXT NULL,
    type TEXT NOT NULL CHECK (type IN ('dollar-lead', 'diamond-lead')),

    -- File-based Package Fields (legacy)
    lead_count INTEGER NOT NULL DEFAULT 0,  -- Number of leads in CSV
    file_name TEXT NULL DEFAULT NULL,
    file_url TEXT NULL DEFAULT NULL,
    file_path TEXT NULL DEFAULT NULL,
    file_size_bytes INTEGER NULL,
    package_date TIMESTAMP WITH TIME ZONE NULL,

    -- Shop Lead Fields (individual leads)
    address TEXT NULL DEFAULT NULL,
    location TEXT NULL DEFAULT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    lead_gen TEXT NULL,
    property_type TEXT NULL,

    -- Location Filters
    state TEXT NULL DEFAULT NULL,
    city TEXT NULL DEFAULT NULL,
    zip_code TEXT NULL DEFAULT NULL,

    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    views INTEGER NOT NULL DEFAULT 0,

    -- Differentiation
    is_package BOOLEAN GENERATED ALWAYS AS (file_url IS NOT NULL) STORED,       
    is_shop_lead BOOLEAN GENERATED ALWAYS AS (address IS NOT NULL) STORED,   

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_lead_items_type ON lead_items(type);
CREATE INDEX idx_lead_items_created_at ON lead_items(created_at DESC);
CREATE INDEX idx_lead_items_user_id ON lead_items(user_id);
CREATE INDEX idx_lead_items_is_active ON lead_items(is_active);
CREATE INDEX idx_lead_items_is_package ON lead_items(is_package);
CREATE INDEX idx_lead_items_is_shop_lead ON lead_items(is_shop_lead);
CREATE INDEX idx_lead_items_views ON lead_items(views);
CREATE INDEX idx_lead_items_updated_at ON lead_items(updated_at DESC);
CREATE INDEX idx_lead_items_price ON lead_items(price);
CREATE INDEX idx_lead_items_lead_gen ON lead_items(lead_gen);
CREATE INDEX idx_lead_items_property_type ON lead_items(property_type);