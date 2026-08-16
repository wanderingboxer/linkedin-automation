import { prisma } from "@/lib/db";
import { generateWithGrounding, trackUsage } from "./gemini";
import type { DiscoveredTopic, DiscoveredSource } from "@/types";

/**
 * Compute freshness score based on how old the content is.
 * 0-24h = 1.0, 24-48h = 0.9, 48-72h = 0.75, 3-7d = 0.5, 7d+ = 0.2
 */
export function freshnessScore(publishedAt?: string | Date | null): number {
  if (!publishedAt) return 0.5;
  const hoursAgo =
    (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 24) return 1.0;
  if (hoursAgo <= 48) return 0.9;
  if (hoursAgo <= 72) return 0.75;
  if (hoursAgo <= 168) return 0.5;
  return 0.2;
}

/**
 * Discover trending topics relevant to a user's profile and content pillars.
 */
export async function discoverTopics(
  userId: string
): Promise<DiscoveredTopic[]> {
  const startTime = Date.now();

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

  const industries = (profile.industries as string[]) || [];
  const interests = (profile.topicsOfInterest as string[]) || [];
  const avoid = (profile.topicsToAvoid as string[]) || [];
  const pillarNames = pillars.map((p) => p.name);

  const searchPrompt = buildDiscoveryPrompt({
    role: profile.currentRole,
    industries,
    interests,
    pillars: pillarNames,
    avoid,
    audience: profile.targetAudience,
  });

  const rawResponse = await generateWithGrounding(searchPrompt);

  const topics = parseDiscoveryResponse(rawResponse);

  // Assign freshness scores
  for (const topic of topics) {
    const sourcesDates = topic.sources
      .map((s) => s.publishedAt)
      .filter(Boolean);
    const freshest = sourcesDates.sort().reverse()[0];
    topic.freshnessScore = freshnessScore(freshest);
  }

  await trackUsage({
    userId,
    operationType: "topic_discovery",
    model: "gemini-2.0-flash",
    durationMs: Date.now() - startTime,
  });

  return topics;
}

interface DiscoveryPromptParams {
  role: string;
  industries: string[];
  interests: string[];
  pillars: string[];
  avoid: string[];
  audience: string;
}

function buildDiscoveryPrompt(params: DiscoveryPromptParams): string {
  return `You are a LinkedIn content research assistant. Find 8-12 trending news stories and developments from the LAST 48 HOURS that would be relevant for creating LinkedIn posts.

Context about the user:
- Current role: ${params.role}
- Industries: ${params.industries.join(", ") || "technology"}
- Topics of interest: ${params.interests.join(", ") || "general business"}
- Content pillars: ${params.pillars.join(", ") || "industry insights"}
- Target audience: ${params.audience || "professionals"}
${params.avoid.length > 0 ? `- Topics to AVOID: ${params.avoid.join(", ")}` : ""}

For each topic, provide a JSON array with objects containing:
- title: concise topic title
- summary: 2-3 sentence summary of what happened
- whyTrending: why this is getting attention right now
- whyMatters: broader industry/business implications
- whyRelevant: why this matters for the user's audience
- category: one of [technology, business, industry, leadership, innovation, policy, culture]
- suggestedAngles: array of 2-3 LinkedIn post angles
- sources: array of {title, url, publisher, publishedAt, sourceType, snippet}

Focus on stories with strong opinion/discussion potential for LinkedIn. Prioritize substance over hype.

Return ONLY a valid JSON array, no markdown formatting.`;
}

function parseDiscoveryResponse(raw: string): DiscoveredTopic[] {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      console.error("Discovery response is not an array");
      return [];
    }

    return parsed.map(
      (item: Record<string, unknown>): DiscoveredTopic => ({
        title: String(item.title || ""),
        summary: String(item.summary || ""),
        whyTrending: String(item.whyTrending || ""),
        whyMatters: String(item.whyMatters || ""),
        whyRelevant: String(item.whyRelevant || ""),
        category: String(item.category || "technology"),
        suggestedAngles: Array.isArray(item.suggestedAngles)
          ? item.suggestedAngles.map(String)
          : [],
        sources: Array.isArray(item.sources)
          ? item.sources.map(
              (s: Record<string, unknown>): DiscoveredSource => ({
                title: String(s.title || ""),
                url: String(s.url || ""),
                publisher: String(s.publisher || ""),
                publishedAt: s.publishedAt
                  ? String(s.publishedAt)
                  : undefined,
                sourceType: String(s.sourceType || "article"),
                snippet: String(s.snippet || ""),
              })
            )
          : [],
        freshnessScore: 0.5,
      })
    );
  } catch (error) {
    console.error("Failed to parse discovery response:", error);
    console.error("Raw response (first 500 chars):", raw.slice(0, 500));
    return [];
  }
}
