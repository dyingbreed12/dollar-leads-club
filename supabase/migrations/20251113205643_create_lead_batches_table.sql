create table if not exists lead_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    batch_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('dollar-lead', 'diamond-lead')),
    total_leads INTEGER NOT NULL,
    imported_leads INTEGER NOT NULL,
    skipped_duplicates INTEGER NOT NULL DEFAULT 0,
    skipped_leads jsonb DEFAULT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE INDEX idx_lead_batches_type ON lead_batches(type);
CREATE INDEX idx_lead_batches_created_at ON lead_batches(created_at DESC);    
CREATE INDEX idx_lead_batches_user_id ON lead_batches(user_id);