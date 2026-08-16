import type {
  Topic,
  TopicSource,
  Post,
  PostVersion,
  GeneratedImage,
  UserProfile,
  ContentPillar,
  ContentFeedback,
  YouTubeVideo,
  YouTubeInsight,
} from "@/generated/prisma";

// ── Topic types ──

export interface TopicWithSources extends Topic {
  sources: TopicSource[];
}

export interface ScoredTopic extends TopicWithSources {
  scores: TopicScoreBreakdown;
}

export interface TopicScoreBreakdown {
  recency: number;
  profileRelevance: number;
  audienceRelevance: number;
  discussionPotential: number;
  uniqueness: number;
  industryImportance: number;
  visualPotential: number;
  sourceQuality: number;
  overall: number;
}

export interface DiscoveredTopic {
  title: string;
  summary: string;
  whyTrending: string;
  whyMatters: string;
  whyRelevant: string;
  category: string;
  suggestedAngles: string[];
  sources: DiscoveredSource[];
  freshnessScore: number;
}

export interface DiscoveredSource {
  title: string;
  url: string;
  publisher: string;
  publishedAt?: string;
  sourceType: string;
  snippet: string;
}

// ── Post types ──

export interface PostWithVersions extends Post {
  versions: PostVersion[];
  images: GeneratedImage[];
}

export interface PostGenerationParams {
  topic: TopicWithSources;
  userProfile: UserProfile;
  tone: string;
  length: "short" | "medium" | "long";
  angle: string;
  previousVersions?: string[];
}

export interface FactCheckResult {
  status: "pass" | "warning" | "fail";
  claims: FactCheckClaim[];
  overallConfidence: number;
  suggestions: string[];
}

export interface FactCheckClaim {
  claim: string;
  verified: boolean;
  confidence: number;
  source?: string;
  note?: string;
}

// ── AI types ──

export interface AIUsageRecord {
  userId: string;
  operationType: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

// ── Content Memory types ──

export interface ContentPreferences {
  preferredTones: string[];
  rejectedPatterns: string[];
  averageLength: number;
  topPerformingAngles: string[];
  topicFrequency: Record<string, number>;
}

export interface DiversityCheck {
  isTooSimilar: boolean;
  similarTopics: { title: string; similarity: number; daysAgo: number }[];
  recommendation: string;
}

// ── YouTube types ──

export interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  uploadsPlaylistId: string;
  subscriberCount?: number;
}

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  thumbnail: string;
}

export interface VideoInsights {
  keyIdeas: string[];
  claims: string[];
  insights: string[];
  implications: string[];
  topicsDiscussed: string[];
  linkedinAngles: string[];
  summary: string;
}

// ── LinkedIn types ──

export interface LinkedInTokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
}

export interface LinkedInMember {
  id: string;
  name: string;
  picture: string;
}

// ── News orchestration ──

export interface TopicCluster {
  primary: DiscoveredTopic;
  related: DiscoveredTopic[];
  mergedScore: number;
}

// ── Scheduler ──

export interface ScheduleResult {
  jobId: string;
  executeAt: Date;
  status: string;
}

// Re-export Prisma types for convenience
export type {
  Topic,
  TopicSource,
  Post,
  PostVersion,
  GeneratedImage,
  UserProfile,
  ContentPillar,
  ContentFeedback,
  YouTubeVideo,
  YouTubeInsight,
};
