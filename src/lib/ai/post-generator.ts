import { generateText, trackUsage } from "./gemini";
import type {
  PostGenerationParams,
  FactCheckResult,
  FactCheckClaim,
  DiscoveredSource,
} from "@/types";

const SYSTEM_PROMPT = `You are an elite LinkedIn content strategist and ghostwriter. Your role is to create high-performing LinkedIn posts that drive engagement, establish thought leadership, and provide genuine value to the reader's professional network.

CORE PRINCIPLES:
1. Lead with insight, not information. Anyone can share news — you provide the "so what" and "what now."
2. Write in the user's authentic voice. Match their tone, vocabulary level, and communication style.
3. Every post must have a clear hook (first 2 lines), a compelling body, and a strong close with either a question or call-to-action.
4. Use concrete examples, data points, and specific observations — never generic platitudes.
5. Optimize for the LinkedIn algorithm: encourage comments, use line breaks for readability, keep paragraphs to 1-3 lines.

POST STRUCTURES:
- INSIGHT: Share a non-obvious observation from the news/topic. Lead with the contrarian or surprising angle.
- CONTRARIAN: Challenge conventional wisdom. "Everyone says X. Here's why Y is actually true."
- NEWS_REACTION: React to breaking news with professional analysis. What does this mean for the industry?
- STORY: Wrap the insight in a brief narrative. "Last week I..." or "A client recently asked me..."
- FRAMEWORK: Present a mental model or framework. Numbered lists, step-by-step breakdowns.
- PREDICTION: Make a bold but defensible prediction based on the trend.

FORMATTING RULES:
- First line must be a hook that stops the scroll. Use pattern interrupts, bold claims, or provocative questions.
- Use single line breaks between thoughts for readability.
- Short paragraphs (1-3 lines max).
- Use emojis sparingly and only if they match the user's style.
- End with an engaging question or clear CTA.
- Include 3-5 relevant hashtags at the end, separated from the main content.
- Never use clickbait or misleading hooks.
- Never start with "I'm excited to announce" or similar LinkedIn clichés.

LENGTH GUIDELINES:
- short: 100-150 words (punchy, one main idea)
- medium: 200-300 words (developed argument with examples)
- long: 400-600 words (deep dive, multiple supporting points)

ATTRIBUTION:
- Always attribute specific claims to their sources naturally within the text.
- Use phrases like "According to [source]", "As [publication] reported", "[Company] just announced".`;

/**
 * Generate a LinkedIn post from a topic and user preferences.
 */
export async function generatePost(
  params: PostGenerationParams
): Promise<string> {
  const startTime = Date.now();

  const { topic, userProfile, tone, length, angle, previousVersions } = params;

  const sourcesContext = topic.sources
    .map(
      (s) =>
        `- ${s.title} (${s.publisher || "unknown source"}): ${s.snippet || s.url}`
    )
    .join("\n");

  const previousContext =
    previousVersions && previousVersions.length > 0
      ? `\n\nPREVIOUS VERSIONS (create something distinctly different):\n${previousVersions.map((v, i) => `--- Version ${i + 1} ---\n${v}`).join("\n")}`
      : "";

  const userContext = `
USER PROFILE:
- Name: ${userProfile.name}
- Role: ${userProfile.currentRole}
- Writing style: ${userProfile.writingStyle}
- Target audience: ${userProfile.targetAudience}
- Content goals: ${userProfile.contentGoals}`;

  const prompt = `${userContext}

TOPIC: ${topic.canonicalTitle}
SUMMARY: ${topic.summary}
WHY IT MATTERS: ${topic.whyMatters}
WHY RELEVANT TO AUDIENCE: ${topic.whyRelevant}

SOURCES:
${sourcesContext}

SUGGESTED ANGLES: ${(topic.suggestedAngles as string[]).join(", ")}

INSTRUCTIONS:
- Tone: ${tone}
- Length: ${length}
- Angle/structure: ${angle || "choose the best fit"}
- Write the LinkedIn post now. Return ONLY the post text, ready to publish.${previousContext}`;

  const result = await generateText(prompt, SYSTEM_PROMPT);

  await trackUsage({
    userId: userProfile.userId,
    operationType: "post_generation",
    model: "gemini-2.0-flash",
    durationMs: Date.now() - startTime,
    metadata: {
      tone,
      length,
      angle,
      topicTitle: topic.canonicalTitle,
    },
  });

  return result.trim();
}

/**
 * Fact-check post content against its sources using Gemini with grounding.
 */
export async function factCheck(
  content: string,
  sources: DiscoveredSource[]
): Promise<FactCheckResult> {
  const sourcesContext = sources
    .map((s) => `- ${s.title} (${s.publisher}): ${s.snippet || s.url}`)
    .join("\n");

  const prompt = `You are a fact-checker for LinkedIn posts. Analyze this post for factual accuracy.

POST CONTENT:
${content}

ORIGINAL SOURCES:
${sourcesContext}

For each factual claim in the post:
1. Identify the specific claim
2. Check if it's supported by the provided sources
3. Rate confidence (0-1)
4. Note any issues

Return a JSON object:
{
  "status": "pass" | "warning" | "fail",
  "claims": [{"claim": "...", "verified": true/false, "confidence": 0.0-1.0, "source": "...", "note": "..."}],
  "overallConfidence": 0.0-1.0,
  "suggestions": ["..."]
}

Return ONLY valid JSON.`;

  const raw = await generateText(prompt);

  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleaned);

    return {
      status: parsed.status || "warning",
      claims: (parsed.claims || []).map(
        (c: Record<string, unknown>): FactCheckClaim => ({
          claim: String(c.claim || ""),
          verified: Boolean(c.verified),
          confidence: Number(c.confidence) || 0,
          source: c.source ? String(c.source) : undefined,
          note: c.note ? String(c.note) : undefined,
        })
      ),
      overallConfidence: Number(parsed.overallConfidence) || 0,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map(String)
        : [],
    };
  } catch (error) {
    console.error("Failed to parse fact-check response:", error);
    return {
      status: "warning",
      claims: [],
      overallConfidence: 0,
      suggestions: [
        "Fact-check parsing failed. Please review the post manually.",
      ],
    };
  }
}
