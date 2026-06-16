create table if not exists leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_batch_id UUID NOT NULL REFERENCES lead_batches(id),
    type TEXT NOT NULL CHECK (type IN ('dollar-lead', 'diamond-lead')),
    status TEXT NOT NULL CHECK (type IN ('available', 'claimed', 'expired')),

    -- Claim Tracking
    claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMP WITH TIME ZONE NULL,

    -- Lead Data (standardized fields)
    full_name TEXT NULL,
    street_address TEXT NULL,
    city TEXT NULL,
    state TEXT NULL,
    zip_code TEXT NULL,
    phone_number TEXT NULL,
    email TEXT NULL,

    -- Property Information
    property_type TEXT NULL,
    lead_gen TEXT NULL,

    -- Financial Data
    estimate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    mao NUMERIC(12, 2) NOT NULL DEFAULT 0.00,  -- Maximum Allowable Offer
    offer_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,

    -- Additional Data
    recording_url TEXT NULL,  -- Call recording for Diamond leads
    notes TEXT NULL,

    -- Raw CSV Data (JSONB for flexibility)
    raw_data JSONB NULL,  -- Store all original CSV columns

    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            COALESCE(full_name, '') || ' ' ||
            COALESCE(street_address, '') || ' ' ||
            COALESCE(city, '') || ' ' ||
            COALESCE(notes, '')
        )
    ) STORED,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

  CREATE INDEX idx_leads_type_status ON leads(type, status);
  CREATE INDEX idx_leads_status ON leads(status) WHERE status =
  'available';
  CREATE INDEX idx_leads_claimed_by ON leads(claimed_by);
  CREATE INDEX idx_leads_batch ON leads(lead_batch_id);
  CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
  CREATE INDEX idx_leads_address ON leads(street_address);
  CREATE INDEX idx_leads_location ON leads(city, state, zip_code);        
  CREATE INDEX idx_leads_search ON leads USING GIN(search_vector);
  CREATE INDEX idx_leads_raw_data ON leads USING GIN(raw_data);
  CREATE INDEX idx_leads_claimed_at ON leads(claimed_at DESC);