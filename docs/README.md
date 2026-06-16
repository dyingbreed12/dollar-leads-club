# Dollar Deal Club v2 - Documentation

Welcome to the project documentation.

---

## Available Documentation

### Firebase to Supabase Migration

- **[Quick Start Guide](./migration-quick-start.md)** - Get running in 5 minutes
- **[Environment Setup](./migration-environments.md)** - Sandbox vs Production scripts
- **[Full Migration Guide](./firebase-to-supabase-migration.md)** - Complete documentation
- **[Data Schema Reference](./migration-data-schema.md)** - Detailed field mappings
- **[Troubleshooting Guide](./migration-troubleshooting.md)** - Common issues and solutions

### Deployment

- **[Vercel Deployment Setup](./vercel-deployment-setup.md)** - Branch-specific environments for sandbox and production

---

## Migration Overview

The migration system transfers data from Firebase Firestore (DollarLeadClub project) to Supabase with:

- **Full data preservation** - All fields mapped correctly
- **Duplicate detection** - Safe to run multiple times
- **ID mapping tracking** - Firebase → Supabase ID relationships
- **Detailed reporting** - See what was migrated
- **Error resilience** - Continues on errors

### Quick Commands

```bash
# Sandbox (development)
npm run migrate:sandbox

# Production
npm run migrate:prod

# Direct (uses current environment)
npm run migrate:firebase
```

### What Gets Migrated

| Source (Firebase) | Destination (Supabase) |
|-------------------|-------------------------|
| users | users |
| leadPool | leads + lead_batches |
| userClaims | user_claims + user_claim_leads |

---

## Important Notes

1. **Temporary Passwords**: Users receive generated passwords. Send reset emails after migration.

2. **Service Account Key**: Required for Firebase access. Delete after migration for security.

3. **Service Role Key**: Required for Supabase admin access. Remove from production after migration.

4. **Idempotent**: Safe to run migration multiple times. Only new data is added.

---

## Project Structure

```
dollar-deal-club-v2/
├── docs/                          # Documentation (you are here)
│   ├── README.md
│   ├── migration-quick-start.md
│   ├── migration-environments.md
│   ├── firebase-to-supabase-migration.md
│   ├── migration-data-schema.md
│   └── migration-troubleshooting.md
├── env/                           # Environment configurations
│   ├── sandbox.env                # Sandbox credentials (git ignored)
│   ├── prod.env                   # Production credentials (git ignored)
│   ├── sandbox.env.example        # Template for sandbox
│   └── prod.env.example           # Template for production
├── scripts/
│   ├── migrate-firebase-to-supabase.ts  # Main migration script
│   ├── migrate-sandbox.sh               # Sandbox runner
│   ├── migrate-prod.sh                  # Production runner
│   └── README.md                         # Script documentation
├── supabase/
│   └── migrations/                # Database migrations
├── firebase-service-account.json  # (You create this - not in git)
└── package.json                   # Scripts including migrate:sandbox, migrate:prod
```

---

## Need Help?

1. Start with [Quick Start Guide](./migration-quick-start.md)
2. Check [Troubleshooting Guide](./migration-troubleshooting.md) for common issues
3. Review [Data Schema](./migration-data-schema.md) for field mappings
4. See [Full Guide](./firebase-to-supabase-migration.md) for advanced usage
