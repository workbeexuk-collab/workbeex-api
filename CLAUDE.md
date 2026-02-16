# WorkBee Backend

## Cloud Run Deployment

### URLs
- **Backend API**: https://nextbee-backend-209731526570.europe-west1.run.app/api/v1
- **Frontend**: https://nextbee-frontend-209731526570.europe-west1.run.app

### GCP Project
- **Project ID**: nextbee-app
- **Region**: europe-west1

## Cloud SQL Database

### Connection Details
- **Host**: 35.187.189.9
- **Port**: 5432
- **Database**: nextbee
- **User**: nextbee_user
- **Password**: WorkBee2024!

### Connection String
```
postgresql://nextbee_user:WorkBee2024!@35.187.189.9:5432/nextbee
```

### Cloud SQL Instance
- **Instance Name**: nextbee-db
- **Connection Name**: nextbee-app:europe-west1:nextbee-db
- **Version**: PostgreSQL 15
- **Tier**: db-f1-micro

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@example.com | Test1234 |
| Provider | provider@example.com | Test1234 |
| Admin | admin@example.com | Test1234 |

## Development Commands

```bash
# Run locally
npm run start:dev

# Database commands
npx prisma studio      # Open database GUI
npx prisma db push     # Sync schema to database (use this, NOT migrate)
npx prisma db seed     # Seed test data
npx prisma generate    # Generate Prisma client

# Deploy to Cloud Run
gcloud run deploy nextbee-backend --source . --region europe-west1 --project nextbee-app
```

## Prisma Guidelines
- **ALWAYS use `npx prisma db push`** for development schema changes
- **DO NOT use `npx prisma migrate dev`** - it creates unnecessary migration files
- For production deployment, use `npx prisma migrate deploy` with existing migrations

## Environment Variables (Production)
- DATABASE_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- FRONTEND_URL
- NODE_ENV=production
