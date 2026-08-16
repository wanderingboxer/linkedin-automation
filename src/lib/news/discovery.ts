import { prisma } from "@/lib/db";
import { discoverTopics } from "@/lib/ai/topic-discovery";
import { scoreTopic, deduplicateTopics } from "@/lib/ai/topic-ranking";
import { checkDiversity } from "@/lib/ai/content-memory";
import type {
  DiscoveredTopic,
  ScoredTopic,
  TopicCluster,
  UserProfile,
  ContentPillar,
} from "@/types";

/**
 * Build search queries from a user profile and their content pillars.
 */
export function buildSearchQueries(
  profile: UserProfile,
  pillars: ContentPillar[]
): string[] {
  const queries: string[] = [];

  const industries = (profile.industries as string[]) || [];
  const interests = (profile.topicsOfInterest as string[]) || [];

  // Industry-specific queries
  for (const industry of industries.slice(0, 3)) {
    queries.push(`latest ${industry} news and trends today`);
  }

  // Pillar-specific queries
  for (const pillar of pillars.slice(0, 5)) {
    const keywords = (pillar.keywords as string[]) || [];
    if (keywords.length > 0) {
      queries.push(
        `${pillar.name}: ${keywords.slice(0, 3).join(", ")} latest developments`
      );
    } else {
      queries.push(`${pillar.name} latest news and insights`);
    }
  }

  // Interest-based queries
  for (const interest of interests.slice(0, 3)) {
    queries.push(`${interest} breaking news or major developments`);
  }

  // Role-based query
  if (profile.currentRole) {
    queries.push(
      `trending topics for ${profile.currentRole} professionals this week`
    );
  }

  return queries;
}

/**
 * Full orchestration: discover, score, deduplicate, and rank topics.
 * Returns the top topics ready for the user to review.
 */
export async function aggregateAndRank(
  userId: string
): Promise<ScoredTopic[]> {
  const [profile, pillars] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.contentPillar.findMany({
      where: { userId, enabled: true },
      orderBy: { priority: "desc" },
    }),
  ]);

  if (!profile) {
    throw new Error(`No profile found for user ${userId}`);
  }

  // Step 1: Discover raw topics via Gemini + search grounding
  const rawTopics = await discoverTopics(userId);

  if (rawTopics.length === 0) {
    return [];
  }

  // Step 2: Deduplicate into clusters
  const clusters = deduplicateTopics(rawTopics);

  // Step 3: Score each cluster's primary topic
  const scored: ScoredTopic[] = [];

  for (const cluster of clusters) {
    const topic = cluster.primary;
    const scores = scoreTopic(topic, profile);

    // Step 4: Check diversity against recent content
    const diversity = await checkDiversity(userId, topic.title);

    // Penalize topics too similar to recent content
    let adjustedOverall = scores.overall;
    if (diversity.isTooSimilar) {
      adjustedOverall *= 0.5;
    } else if (diversity.similarTopics.length > 0) {
      adjustedOverall *= 0.8;
    }

    scored.push({
      // Map DiscoveredTopic fields to the Topic model shape for ScoredTopic
      id: "", // will be set on DB save
      userId,
      canonicalTitle: topic.title,
      summary: topic.summary,
      whyTrending: topic.whyTrending,
      whyMatters: topic.whyMatters,
      whyRelevant: topic.whyRelevant,
      category: topic.category,
      freshnessScore: topic.freshnessScore,
      relevanceScore: scores.profileRelevance,
      trendScore: scores.discussionPotential,
      overallScore: adjustedOverall,
      postPotential:
        adjustedOverall >= 0.7
          ? "HIGH"
          : adjustedOverall >= 0.4
            ? "MEDIUM"
            : "LOW",
      analysis: {
        diversityCheck: diversity,
        clusterSize: 1 + cluster.related.length,
      } as any,
      suggestedAngles: topic.suggestedAngles,
      dismissed: false,
      discoveredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      userId2: null,
      pillarId: matchPillar(topic, pillars)?.id ?? null,
      sources: topic.sources.map((s) => ({
        id: "",
        topicId: "",
        title: s.title,
        url: s.url,
        publisher: s.publisher,
        publishedAt: s.publishedAt ? new Date(s.publishedAt) : null,
        sourceType: s.sourceType,
        tier: 3,
        credibility: "unknown",
        snippet: s.snippet,
        createdAt: new Date(),
      })),
      scores: { ...scores, overall: adjustedOverall },
    });
  }

  // Sort by overall score descending
  scored.sort((a, b) => b.scores.overall - a.scores.overall);

  return scored;
}

/**
 * Match a topic to the most relevant content pillar.
 */
function matchPillar(
  topic: DiscoveredTopic,
  pillars: ContentPillar[]
): ContentPillar | null {
  const topicText =
    `${topic.title} ${topic.summary} ${topic.category}`.toLowerCase();

  let bestMatch: ContentPillar | null = null;
  let bestScore = 0;

  for (const pillar of pillars) {
    const keywords = (pillar.keywords as string[]) || [];
    const excluded = (pillar.excludedKeywords as string[]) || [];

    // Check exclusions first
    if (excluded.some((kw) => topicText.includes(kw.toLowerCase()))) {
      continue;
    }

    let score = 0;
    if (topicText.includes(pillar.name.toLowerCase())) score += 2;
    for (const kw of keywords) {
      if (topicText.includes(kw.toLowerCase())) score++;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = pillar;
    }
  }

  return bestMatch;
}
