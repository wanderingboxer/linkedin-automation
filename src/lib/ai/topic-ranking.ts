import type {
  DiscoveredTopic,
  ScoredTopic,
  TopicScoreBreakdown,
  TopicCluster,
  UserProfile,
} from "@/types";

const SCORE_WEIGHTS = {
  recency: 0.2,
  profileRelevance: 0.2,
  audienceRelevance: 0.15,
  discussionPotential: 0.15,
  uniqueness: 0.1,
  industryImportance: 0.1,
  visualPotential: 0.05,
  sourceQuality: 0.05,
} as const;

/**
 * Score a single topic against a user profile.
 */
export function scoreTopic(
  topic: DiscoveredTopic,
  userProfile: UserProfile
): TopicScoreBreakdown {
  const recency = topic.freshnessScore;
  const profileRelevance = computeProfileRelevance(topic, userProfile);
  const audienceRelevance = computeAudienceRelevance(topic, userProfile);
  const discussionPotential = computeDiscussionPotential(topic);
  const uniqueness = computeUniqueness(topic);
  const industryImportance = computeIndustryImportance(topic, userProfile);
  const visualPotential = computeVisualPotential(topic);
  const sourceQuality = computeSourceQuality(topic);

  const overall =
    recency * SCORE_WEIGHTS.recency +
    profileRelevance * SCORE_WEIGHTS.profileRelevance +
    audienceRelevance * SCORE_WEIGHTS.audienceRelevance +
    discussionPotential * SCORE_WEIGHTS.discussionPotential +
    uniqueness * SCORE_WEIGHTS.uniqueness +
    industryImportance * SCORE_WEIGHTS.industryImportance +
    visualPotential * SCORE_WEIGHTS.visualPotential +
    sourceQuality * SCORE_WEIGHTS.sourceQuality;

  return {
    recency,
    profileRelevance,
    audienceRelevance,
    discussionPotential,
    uniqueness,
    industryImportance,
    visualPotential,
    sourceQuality,
    overall,
  };
}

function computeProfileRelevance(
  topic: DiscoveredTopic,
  profile: UserProfile
): number {
  const skills = (profile.skills as string[]) || [];
  const interests = (profile.topicsOfInterest as string[]) || [];
  const industries = (profile.industries as string[]) || [];
  const allTerms = [...skills, ...interests, ...industries].map((t) =>
    t.toLowerCase()
  );

  if (allTerms.length === 0) return 0.5;

  const titleLower = topic.title.toLowerCase();
  const summaryLower = topic.summary.toLowerCase();
  const combined = `${titleLower} ${summaryLower}`;

  let matchCount = 0;
  for (const term of allTerms) {
    if (combined.includes(term)) matchCount++;
  }

  return Math.min(matchCount / Math.max(allTerms.length * 0.3, 1), 1.0);
}

function computeAudienceRelevance(
  topic: DiscoveredTopic,
  profile: UserProfile
): number {
  if (!profile.targetAudience) return 0.5;

  const audienceTerms = profile.targetAudience
    .toLowerCase()
    .split(/[\s,;]+/)
    .filter((t) => t.length > 3);

  const combined = `${topic.title} ${topic.summary} ${topic.whyRelevant}`.toLowerCase();

  let matches = 0;
  for (const term of audienceTerms) {
    if (combined.includes(term)) matches++;
  }

  return audienceTerms.length > 0
    ? Math.min(matches / Math.max(audienceTerms.length * 0.3, 1), 1.0)
    : 0.5;
}

function computeDiscussionPotential(topic: DiscoveredTopic): number {
  let score = 0.5;

  // Topics with contrarian or opinion angles score higher
  const angles = topic.suggestedAngles.join(" ").toLowerCase();
  if (/contrar|debate|controversial|unpopular/i.test(angles)) score += 0.2;
  if (/insight|lesson|takeaway/i.test(angles)) score += 0.15;
  if (topic.suggestedAngles.length >= 3) score += 0.1;

  // Longer whyMatters suggests more depth
  if (topic.whyMatters.length > 100) score += 0.1;

  return Math.min(score, 1.0);
}

function computeUniqueness(topic: DiscoveredTopic): number {
  // Heuristic: niche categories and fewer sources suggest less saturation
  const nicheCategories = ["policy", "culture", "innovation"];
  let score = 0.5;
  if (nicheCategories.includes(topic.category)) score += 0.2;
  if (topic.sources.length <= 2) score += 0.15;
  if (topic.sources.length >= 5) score -= 0.1; // highly covered = less unique
  return Math.max(0, Math.min(score, 1.0));
}

function computeIndustryImportance(
  topic: DiscoveredTopic,
  profile: UserProfile
): number {
  const industries = (profile.industries as string[]) || [];
  if (industries.length === 0) return 0.5;

  const combined = `${topic.title} ${topic.summary} ${topic.category}`.toLowerCase();
  for (const ind of industries) {
    if (combined.includes(ind.toLowerCase())) return 0.85;
  }
  return 0.4;
}

function computeVisualPotential(topic: DiscoveredTopic): number {
  const keywords = /data|chart|statistic|number|percent|growth|decline|comparison|infographic/i;
  const combined = `${topic.title} ${topic.summary}`;
  return keywords.test(combined) ? 0.8 : 0.4;
}

function computeSourceQuality(topic: DiscoveredTopic): number {
  const tier1Publishers = [
    "reuters", "bloomberg", "wsj", "nytimes", "techcrunch", "wired",
    "bbc", "financial times", "the verge", "ars technica", "nature",
    "harvard business review", "mit technology review",
  ];

  if (topic.sources.length === 0) return 0.3;

  let tier1Count = 0;
  for (const source of topic.sources) {
    const pub = source.publisher.toLowerCase();
    if (tier1Publishers.some((t1) => pub.includes(t1))) tier1Count++;
  }

  const ratio = tier1Count / topic.sources.length;
  return 0.3 + ratio * 0.7;
}

/**
 * Deduplicate topics by clustering similar ones together.
 * Uses simple keyword overlap similarity.
 */
export function deduplicateTopics(
  topics: DiscoveredTopic[]
): TopicCluster[] {
  const used = new Set<number>();
  const clusters: TopicCluster[] = [];

  for (let i = 0; i < topics.length; i++) {
    if (used.has(i)) continue;
    used.add(i);

    const cluster: TopicCluster = {
      primary: topics[i],
      related: [],
      mergedScore: 0,
    };

    for (let j = i + 1; j < topics.length; j++) {
      if (used.has(j)) continue;

      const similarity = computeSimilarity(topics[i], topics[j]);
      if (similarity > 0.5) {
        cluster.related.push(topics[j]);
        used.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

function computeSimilarity(a: DiscoveredTopic, b: DiscoveredTopic): number {
  const wordsA = extractKeywords(`${a.title} ${a.summary}`);
  const wordsB = extractKeywords(`${b.title} ${b.summary}`);

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

function extractKeywords(text: string): Set<string> {
  const stopwords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "can", "shall",
    "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "and",
    "but", "or", "not", "no", "nor", "so", "yet", "both", "each",
    "this", "that", "these", "those", "it", "its", "they", "them",
    "their", "we", "our", "you", "your", "he", "she", "his", "her",
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w))
  );
}
