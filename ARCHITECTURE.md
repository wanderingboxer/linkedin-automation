# Architecture

## High-Level Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   News Sources    |     |  YouTube Channels |     |   Manual Input    |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                         |
         v                         v                         v
+--------+-------------------------+-------------------------+----------+
|                        Topic Discovery Engine                         |
|  (src/lib/ai/topic-discovery.ts, src/lib/news/discovery.ts)          |
+--------+-------------------------------------------------------------+
         |
         v
+--------+-------------------------------------------------------------+
|                        Topic Scoring & Ranking                        |
|  Freshness x Relevance x Trend Score --> Overall Score                |
|  (src/lib/ai/topic-ranking.ts)                                       |
+--------+-------------------------------------------------------------+
         |
         v
+--------+-------------------------------------------------------------+
|                        Post Generation (Gemini)                       |
|  Topic + Profile + Pillars + Tone/Length/Angle --> Draft              |
|  (src/lib/ai/post-generator.ts)                                      |
+--------+-------------------------------------------------------------+
         |
         v
+--------+-------------------------------------------------------------+
|                        Image Generation (Gemini)                      |
|  Post content --> Image prompt --> Generated image                    |
|  (src/lib/ai/image-generator.ts)                                     |
+--------+-------------------------------------------------------------+
         |
         v
+--------+-------------------------------------------------------------+
|                        User Review & Approval                         |
|  Text approval --> Image approval --> Ready to publish                |
|  (Dashboard UI: /drafts, /create)                                    |
+--------+-------------------------------------------------------------+
         |
         v
+--------+-------------------------------------------------------------+
|                        Scheduler                                      |
|  Scheduled jobs polled via /api/scheduler/process                     |
|  (src/lib/scheduler/scheduler.ts)                                    |
+--------+-------------------------------------------------------------+
         |
         v
+--------+-------------------------------------------------------------+
|                        LinkedIn Publisher                              |
|  OAuth token --> Posts API --> Idempotent publish with retry           |
|  (src/lib/linkedin/publisher.ts)                                     |
+--------+-------------------------------------------------------------+
```

## Core Components

### 1. News Discovery
**Location**: `src/lib/news/discovery.ts`, `src/lib/ai/topic-discovery.ts`

Discovers trending topics from external news sources. Uses Gemini to extract and deduplicate topics, assess relevance to the user's profile, and generate summaries. Each topic is stored with source URLs, publisher metadata, and credibility tiers.

### 2. YouTube Integration
**Location**: `src/lib/youtube/channels.ts`, `src/lib/youtube/processor.ts`

Syncs videos from subscribed YouTube channels using the YouTube Data API v3. Processes video metadata and uses Gemini to extract key ideas, claims, insights, and LinkedIn-specific content angles stored as `YouTubeInsight` records.

### 3. Topic Scoring
**Location**: `src/lib/ai/topic-ranking.ts`

Ranks discovered topics using three weighted signals:
- **Freshness Score** (0-1): How recent the topic is
- **Relevance Score** (0-1): Match against user profile, skills, industries, and content pillars
- **Trend Score** (0-1): Momentum and viral potential

Combined into an `overallScore` with a `postPotential` rating (LOW / MEDIUM / HIGH).

### 4. Post Generation
**Location**: `src/lib/ai/post-generator.ts`

Takes a scored topic and generates a LinkedIn post draft using Gemini. Inputs include the user's profile, writing style, target audience, selected content pillar, and controls for tone, length, and angle. Each generation is tracked as a `PostVersion` with full prompt history.

### 5. Content Memory
**Location**: `src/lib/ai/content-memory.ts`

Maintains a feedback loop by tracking user preferences, approved/rejected content patterns, and style adjustments over time. Fed back into generation prompts to improve output quality.

### 6. Image Generation
**Location**: `src/lib/ai/image-generator.ts`

Generates accompanying images for posts using Gemini's image generation model. Images go through a separate approval workflow. Stored locally (configurable via `STORAGE_PROVIDER`).

### 7. LinkedIn Publisher
**Location**: `src/lib/linkedin/publisher.ts`, `src/lib/linkedin/oauth.ts`

Handles the full LinkedIn integration:
- **OAuth**: Authorization code flow with token refresh
- **Publishing**: Posts API with idempotent publish attempts (each attempt gets a unique idempotency key to prevent duplicates)
- **Connection management**: Token storage, refresh, and disconnection

### 8. Scheduler
**Location**: `src/lib/scheduler/scheduler.ts`

Processes scheduled post jobs. The `/api/scheduler/process` endpoint is designed to be called by an external cron trigger (e.g., Vercel Cron, GitHub Actions). It picks up pending `ScheduledJob` records whose `executeAt` time has passed and triggers the publish flow.

## Post State Machine

```
                    +-------+
                    | DRAFT |
                    +---+---+
                        |
              +---------+---------+
              v                   v
    +-------------------+   +-----------+
    | TEXT_APPROVED      |   | CANCELLED |
    +--------+----------+   +-----------+
             |
             v
    +-------------------+
    | IMAGE_APPROVED     |
    +--------+----------+
             |
       +-----+------+
       v             v
  +-----------+  +----------+
  | SCHEDULED |  | APPROVED |
  +-----+-----+  +----+-----+
        |              |
        v              v
    +----------+  +----------+
    | PUBLISHING|  | PUBLISHING|
    +-----+----+  +-----+----+
          |              |
     +----+----+    +----+----+
     v         v    v         v
+-----------+ +---------+ +--------+
| PUBLISHED | | FAILED  | | FAILED |
+-----------+ +---------+ +--------+
```

Valid statuses: `DRAFT`, `TEXT_APPROVED`, `IMAGE_APPROVED`, `APPROVED`, `SCHEDULED`, `PUBLISHING`, `PUBLISHED`, `FAILED`, `CANCELLED`

## Database Schema Overview

### Authentication
- **User** -- Core user record (email, password hash, timestamps)
- **Account** -- OAuth provider accounts (NextAuth adapter)
- **Session** -- Active sessions (NextAuth adapter)
- **VerificationToken** -- Email verification tokens

### Profile & Settings
- **UserProfile** -- Professional details, writing style, target audience, content goals
- **UserPreference** -- Key-value user settings
- **ContentPillar** -- Content strategy categories with keywords and priority
- **LinkedInConnection** -- OAuth tokens and LinkedIn member info

### Content Pipeline
- **Topic** -- Discovered topics with scores and analysis
- **TopicSource** -- Source articles/URLs backing a topic
- **Post** -- Generated post drafts with full lifecycle state
- **PostVersion** -- Version history for each post iteration
- **GeneratedImage** -- AI-generated images linked to posts

### Publishing
- **PublishAttempt** -- Idempotent publish attempts with status tracking
- **ScheduledJob** -- Pending scheduled publishes with retry state

### Analytics & Tracking
- **AnalyticsSnapshot** -- Point-in-time post performance metrics
- **AIInteraction** -- Token usage and cost tracking per AI call
- **ContentFeedback** -- User feedback on generated content

### YouTube
- **YouTubeChannel** -- Subscribed channels
- **YouTubeVideo** -- Synced videos
- **YouTubeInsight** -- AI-extracted insights from videos

## API Routes Overview

| Route | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth authentication |
| `/api/auth/register` | POST | User registration |
| `/api/profile` | GET/PUT | User profile management |
| `/api/topics` | GET | List discovered topics |
| `/api/topics/[id]` | GET/PUT/DELETE | Topic management |
| `/api/topics/discover` | POST | Trigger topic discovery |
| `/api/posts` | GET/POST | List posts / create draft |
| `/api/posts/generate` | POST | Generate post from topic |
| `/api/posts/[id]` | GET/PUT/DELETE | Post CRUD |
| `/api/posts/[id]/regenerate` | POST | Regenerate post content |
| `/api/posts/[id]/approve-text` | POST | Approve post text |
| `/api/posts/[id]/generate-image` | POST | Generate post image |
| `/api/posts/[id]/regenerate-image` | POST | Regenerate image |
| `/api/posts/[id]/approve-image` | POST | Approve post image |
| `/api/posts/[id]/fact-check` | POST | Run fact check |
| `/api/posts/[id]/schedule` | POST | Schedule post |
| `/api/posts/[id]/publish` | POST | Publish to LinkedIn |
| `/api/posts/[id]/cancel` | POST | Cancel post |
| `/api/posts/[id]/versions` | GET | Get version history |
| `/api/linkedin/connect` | GET | Start LinkedIn OAuth flow |
| `/api/linkedin/callback` | GET | OAuth callback handler |
| `/api/linkedin/disconnect` | POST | Disconnect LinkedIn |
| `/api/linkedin/status` | GET | Connection status |
| `/api/settings/pillars` | GET/POST | Content pillar management |
| `/api/settings/pillars/[id]` | PUT/DELETE | Individual pillar ops |
| `/api/scheduler/process` | POST | Process scheduled jobs |
| `/api/youtube/videos` | GET | List synced videos |
