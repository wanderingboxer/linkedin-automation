import { prisma } from "@/lib/db";
import type { ContentPreferences, DiversityCheck } from "@/types";

/**
 * Get content history for a user: recent topics and posts with their outcomes.
 */
export async function getContentHistory(userId: string) {
  const [recentTopics, recentPosts, feedback] = await Promise.all([
    prisma.topic.findMany({
      where: { userId },
      orderBy: { discoveredAt: "desc" },
      take: 50,
      include: { sources: true },
    }),
    prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { versions: true },
    }),
    prisma.contentFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    recentTopics,
    recentPosts,
    feedback,
    publishedPosts: recentPosts.filter((p) => p.status === "PUBLISHED"),
    rejectedPosts: recentPosts.filter(
      (p) => p.status === "REJECTED" || p.rejectionReason
    ),
    approvedTopicCategories: recentTopics
      .filter((t) => !t.dismissed)
      .map((t) => t.category),
    dismissedTopicCategories: recentTopics
      .filter((t) => t.dismissed)
      .map((t) => t.category),
  };
}

/**
 * Analyze a user's content preferences from their history.
 */
export async function analyzePreferences(
  userId: string
): Promise<ContentPreferences> {
  const history = await getContentHistory(userId);

  // Preferred tones from published posts
  const toneCount: Record<string, number> = {};
  for (const post of history.publishedPosts) {
    toneCount[post.tone] = (toneCount[post.tone] || 0) + 1;
  }
  const preferredTones = Object.entries(toneCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([tone]) => tone);

  // Rejected patterns from feedback
  const rejectedPatterns = history.feedback
    .filter((f) => f.type === "reject" || f.type === "dislike")
    .map((f) => f.reason)
    .filter(Boolean);

  // Average length of published posts
  const lengths = history.publishedPosts.map((p) => p.content.length);
  const averageLength =
    lengths.length > 0
      ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
      : 300;

  // Top performing angles
  const angleCount: Record<string, number> = {};
  for (const post of history.publishedPosts) {
    if (post.angle) {
      angleCount[post.angle] = (angleCount[post.angle] || 0) + 1;
    }
  }
  const topPerformingAngles = Object.entries(angleCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([angle]) => angle);

  // Topic frequency
  const topicFrequency: Record<string, number> = {};
  for (const cat of history.approvedTopicCategories) {
    topicFrequency[cat] = (topicFrequency[cat] || 0) + 1;
  }

  return {
    preferredTones,
    rejectedPatterns,
    averageLength,
    topPerformingAngles,
    topicFrequency,
  };
}

/**
 * Check whether a new topic is too similar to recently covered topics.
 */
export async function checkDiversity(
  userId: string,
  newTopicTitle: string
): Promise<DiversityCheck> {
  const recentTopics = await prisma.topic.findMany({
    where: {
      userId,
      dismissed: false,
      discoveredAt: {
        gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days
      },
    },
    orderBy: { discoveredAt: "desc" },
    take: 20,
  });

  const newWords = extractWords(newTopicTitle);
  const similarTopics: DiversityCheck["similarTopics"] = [];

  for (const topic of recentTopics) {
    const existingWords = extractWords(topic.canonicalTitle);
    const similarity = jaccardSimilarity(newWords, existingWords);

    if (similarity > 0.3) {
      const daysAgo = Math.round(
        (Date.now() - topic.discoveredAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      similarTopics.push({
        title: topic.canonicalTitle,
        similarity,
        daysAgo,
      });
    }
  }

  const isTooSimilar = similarTopics.some((t) => t.similarity > 0.6);
  const recommendation = isTooSimilar
    ? "This topic is very similar to recent content. Consider a different angle or skip it."
    : similarTopics.length > 0
      ? "Some overlap with recent topics exists, but a fresh angle could work."
      : "This topic is fresh and distinct from recent content.";

  return { isTooSimilar, similarTopics, recommendation };
}

function extractWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}
