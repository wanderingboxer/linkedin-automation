# LinkedIn Content Assistant

An AI-powered LinkedIn content creation and scheduling platform built with Next.js. It discovers trending topics, generates personalized post drafts using Google Gemini, creates accompanying images, and publishes directly to LinkedIn through the official API.

## Features

- **Topic Discovery** -- Automated discovery of trending industry topics from news sources and YouTube channels
- **AI-Powered Scoring** -- Topics ranked by freshness, relevance to your profile, and trend momentum
- **Content Pillars** -- Organize your content strategy around 16 configurable pillars (Supply Chain, AI/ML, SaaS, etc.)
- **Post Generation** -- Gemini-powered draft creation with tone, length, and angle controls
- **Image Generation** -- AI-generated post images with approval workflow
- **Fact Checking** -- Automated fact-check pass before publishing
- **Version History** -- Full version tracking for every post iteration
- **LinkedIn Publishing** -- Direct publishing via LinkedIn API with idempotent retry logic
- **Scheduling** -- Schedule posts for optimal times with timezone support
- **YouTube Integration** -- Extract insights from YouTube channels for content inspiration
- **Analytics** -- Track post performance (impressions, reactions, comments, reposts)
- **Content Memory** -- AI remembers your style preferences and past feedback

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM (pg adapter)
- **Auth**: NextAuth.js (credentials provider, JWT sessions)
- **AI**: Google Gemini (text generation via gemini-2.5-flash, image generation via gemini-2.0-flash-preview-image-generation)
- **UI**: Tailwind CSS 4, Radix UI primitives, Lucide icons
- **APIs**: LinkedIn API (OAuth 2.0 + Posts API), YouTube Data API v3

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- API keys (see below)

## Setup

```bash
# Clone the repository
git clone <repo-url>
cd linkedin-automation

# Install dependencies
npm install

# Copy environment variables
cp .env .env.local
# Edit .env.local with your actual values (see Environment Variables below)

# Run database migrations
npx prisma migrate dev

# Seed the database with default data
npx prisma db seed

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the app.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for JWT signing (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` for local dev) |
| `LINKEDIN_CLIENT_ID` | LinkedIn Developer App client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn Developer App client secret |
| `LINKEDIN_REDIRECT_URI` | OAuth callback URL (`http://localhost:3000/api/linkedin/callback`) |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `GEMINI_TEXT_MODEL` | Text model ID (default: `gemini-2.5-flash`) |
| `GEMINI_IMAGE_MODEL` | Image model ID (default: `gemini-2.0-flash-preview-image-generation`) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `STORAGE_PROVIDER` | Image storage provider (`local`) |
| `STORAGE_PATH` | Local image storage path (`./public/uploads`) |
| `APP_URL` | Public app URL |

## External API Setup

### LinkedIn Developer App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) and create a new app.
2. Under **Auth**, add `http://localhost:3000/api/linkedin/callback` as an authorized redirect URL.
3. Under **Products**, request access to:
   - **Share on LinkedIn** (provides `w_member_social` scope)
   - **Sign In with LinkedIn using OpenID Connect** (provides `openid`, `profile`, `email` scopes)
4. Copy the Client ID and Client Secret into your `.env.local`.

> **Note on LinkedIn API Permissions**: The Posts API requires the `w_member_social` scope. For full access to analytics and organization posting, you may need to apply for the **Marketing Developer Platform** -- this requires a company page and LinkedIn review, which can take several weeks.

### Google Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and create an API key.
2. Set `GEMINI_API_KEY` in your `.env.local`.

### YouTube Data API

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com).
2. Enable the YouTube Data API v3.
3. Create an API key under Credentials.
4. Set `YOUTUBE_API_KEY` in your `.env.local`.

## Architecture

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

### High-Level Flow

```
News/YouTube Sources --> Topic Discovery --> AI Scoring --> Topic Selection
    --> Post Generation (Gemini) --> Image Generation --> User Review
    --> Approval --> Scheduling --> LinkedIn Publishing
```

### Key Directories

```
src/
  app/                    # Next.js App Router pages and API routes
    (dashboard)/          # Authenticated dashboard pages
    api/                  # REST API endpoints
      auth/               # NextAuth + registration
      posts/              # CRUD, generation, publishing, scheduling
      topics/             # Discovery and management
      linkedin/           # OAuth flow and status
      settings/           # Content pillars
      scheduler/          # Cron job processor
      youtube/            # YouTube video sync
  components/             # React components (UI primitives, providers)
  lib/                    # Core business logic
    ai/                   # Gemini integration (post gen, topic discovery, scoring, images)
    linkedin/             # OAuth and publishing client
    news/                 # News source discovery
    youtube/              # Channel sync and video processing
    scheduler/            # Job scheduler
    storage/              # Image storage
  generated/prisma/       # Generated Prisma client
prisma/
  schema.prisma           # Database schema
  migrations/             # Migration history
```

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Run ESLint
npx prisma studio # Browse database
```

For detailed setup instructions including step-by-step API configuration, see [SETUP.md](./SETUP.md).
