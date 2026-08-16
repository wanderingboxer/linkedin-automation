# Setup Guide

Step-by-step instructions to get the LinkedIn Content Assistant running locally.

## 1. Prerequisites

Install these before proceeding:

- **Node.js** 18 or later -- [nodejs.org](https://nodejs.org/)
- **PostgreSQL** 14 or later -- [postgresql.org/download](https://www.postgresql.org/download/)
- **Git** -- [git-scm.com](https://git-scm.com/)

## 2. Clone and Install

```bash
git clone <repo-url>
cd linkedin-automation
npm install
```

## 3. Create the Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE linkedin_automation;

# (Optional) Create a dedicated user
CREATE USER linkedin_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE linkedin_automation TO linkedin_user;
\q
```

## 4. Configure Environment Variables

```bash
cp .env .env.local
```

Edit `.env.local` with your values:

```env
DATABASE_URL=postgresql://linkedin_user:your_password@localhost:5432/linkedin_automation
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

The remaining API keys are configured in the steps below.

## 5. LinkedIn Developer App

### Create the App

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps).
2. Click **Create App**.
3. Fill in:
   - **App name**: e.g., "Content Assistant Dev"
   - **LinkedIn Page**: Select or create a company page (required by LinkedIn)
   - **App logo**: Upload any image
4. Click **Create App**.

### Configure OAuth

1. Go to the **Auth** tab.
2. Under **Authorized redirect URLs for your app**, add:
   ```
   http://localhost:3000/api/linkedin/callback
   ```
3. Note the **Client ID** and **Client Secret**.

### Request API Products

1. Go to the **Products** tab.
2. Request access to:
   - **Share on LinkedIn** -- Grants `w_member_social` (required for posting)
   - **Sign In with LinkedIn using OpenID Connect** -- Grants `openid`, `profile`, `email`
3. Some products are approved instantly; others (like Marketing Developer Platform) require review.

### Set Environment Variables

```env
LINKEDIN_CLIENT_ID=<your-client-id>
LINKEDIN_CLIENT_SECRET=<your-client-secret>
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/linkedin/callback
```

> **Important**: If you need access to analytics endpoints or posting on behalf of organizations, you must apply for the **Marketing Developer Platform**. This requires a LinkedIn Company Page with a verified admin, and approval can take 2-4 weeks.

## 6. Google Gemini API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Click **Create API Key**.
3. Select or create a Google Cloud project.
4. Copy the key.

```env
GEMINI_API_KEY=<your-api-key>
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.0-flash-preview-image-generation
```

The default models work well. Change them only if you want to use a different Gemini variant.

## 7. YouTube Data API Key

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Select the same project used for Gemini (or create a new one).
3. Navigate to **APIs & Services > Library**.
4. Search for **YouTube Data API v3** and click **Enable**.
5. Go to **APIs & Services > Credentials**.
6. Click **Create Credentials > API Key**.
7. Copy the key.

```env
YOUTUBE_API_KEY=<your-api-key>
```

**Recommended**: Restrict the API key to only the YouTube Data API v3 under **API restrictions** in the key settings.

## 8. Run Database Migrations

```bash
npx prisma migrate dev
```

This creates all tables defined in `prisma/schema.prisma`.

## 9. Seed the Database

```bash
npx prisma db seed
```

This creates:
- A default admin user (`admin@example.com` / `password123`)
- A user profile pre-configured with sample data
- 16 default content pillars

## 10. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First Login

1. Sign in with `admin@example.com` / `password123`.
2. Go to **Settings** and review your profile and content pillars.
3. Go to **Settings** and connect your LinkedIn account (click the LinkedIn connect button, authorize the app).
4. Go to **Sources** to add YouTube channels if desired.
5. Go to **Topics** and click **Discover** to find trending topics.
6. Select a topic and generate your first post.

## 11. Scheduled Job Processing

Posts can be scheduled for future publishing. The scheduler endpoint needs to be called periodically:

**Local development** -- use a simple cron or curl loop:

```bash
# Every minute
watch -n 60 curl -s -X POST http://localhost:3000/api/scheduler/process
```

**Production** -- use Vercel Cron Jobs, GitHub Actions, or any external cron service to POST to `/api/scheduler/process` every 1-5 minutes.

## Troubleshooting

### Database connection fails
- Verify PostgreSQL is running: `pg_isready`
- Check your `DATABASE_URL` format: `postgresql://user:password@host:port/database`

### LinkedIn OAuth returns an error
- Verify the redirect URI in your LinkedIn app matches `LINKEDIN_REDIRECT_URI` exactly
- Ensure the app has the required products approved

### Gemini API returns 403
- Verify the API key is valid at [aistudio.google.com](https://aistudio.google.com/)
- Check that billing is enabled on the Google Cloud project if you've exceeded the free tier

### YouTube API quota exceeded
- The YouTube Data API has a daily quota of 10,000 units
- Each search/list call costs 100 units
- Reduce sync frequency or request a quota increase in Google Cloud Console
