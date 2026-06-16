create table if not exists user_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
     -- Claim Information
    type TEXT NOT NULL CHECK (type IN ('dollar-lead', 'diamond-lead')),
    claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    lead_count INTEGER NOT NULL CHECK (lead_count > 0),

    -- User Activity Tracking
    viewed BOOLEAN NOT NULL DEFAULT FALSE,
    viewed_at TIMESTAMP WITH TIME ZONE NULL,
    downloaded BOOLEAN NOT NULL DEFAULT FALSE,
    downloaded_at TIMESTAMP WITH TIME ZONE NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_claims_type ON user_claims(type);
CREATE INDEX idx_user_claims_claimed_at ON user_claims(claimed_at DESC);
CREATE INDEX idx_user_claims_viewed ON user_claims(viewed);
CREATE INDEX idx_user_claims_downloaded ON user_claims(downloaded);
CREATE INDEX idx_user_claims_created_at ON user_claims(created_at DESC);
CREATE INDEX idx_user_claims_updated_at ON user_claims(updated_at DESC);
CREATE INDEX idx_user_claims_user_id ON user_claims(user_id);