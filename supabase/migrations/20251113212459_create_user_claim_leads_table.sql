create table if not exists user_claim_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_claim_id UUID NOT NULL REFERENCES user_claims(id),
    lead_id UUID NOT NULL REFERENCES leads(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_claim_leads_user_claim_id ON user_claim_leads(user_claim_id);
CREATE INDEX idx_user_claim_leads_lead_id ON user_claim_leads(lead_id);
CREATE INDEX idx_user_claim_leads_created_at ON user_claim_leads(created_at DESC);
CREATE INDEX idx_user_claim_leads_updated_at ON user_claim_leads(updated_at DESC);