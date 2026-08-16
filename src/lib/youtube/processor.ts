import { prisma } from "@/lib/db";
import { generateText, trackUsage } from "@/lib/ai/gemini";
import { getLatestVideos } from "./channels";
import type { VideoInsights } from "@/types";

/**
 * Extract LinkedIn-worthy insights from a YouTube video using Gemini.
 */
export async function processVideo(videoId: string): Promise<VideoInsights> {
  const startTime = Date.now();

  const video = await prisma.youTubeVideo.findUnique({
    where: { videoId },
  });

  if (!video) {
    throw new Error(`YouTube video not found: ${videoId}`);
  }

  const prompt = `Analyze this YouTube video and extract insights that could be turned into LinkedIn posts.

Video Title: ${video.title}
Video Description: ${video.description.slice(0, 3000)}

Extract:
1. keyIdeas: The 3-5 most important ideas or takeaways
2. claims: Any specific claims, data points, or statistics mentioned
3. insights: Non-obvious insights or connections the video makes
4. implications: What these ideas mean for the broader industry
5. topicsDiscussed: Main topics/themes covered
6. linkedinAngles: 2-3 specific LinkedIn post angles based on this video
7. summary: A concise 2-3 sentence summary

Return ONLY valid JSON matching the structure above. All values should be string arrays except summary which is a string.`;

  const raw = await generateText(prompt);

  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let insights: VideoInsights;

  try {
    const parsed = JSON.parse(cleaned);
    insights = {
      keyIdeas: Array.isArray(parsed.keyIdeas)
        ? parsed.keyIdeas.map(String)
        : [],
      claims: Array.isArray(parsed.claims) ? parsed.claims.map(String) : [],
      insights: Array.isArray(parsed.insights)
        ? parsed.insights.map(String)
        : [],
      implications: Array.isArray(parsed.implications)
        ? parsed.implications.map(String)
        : [],
      topicsDiscussed: Array.isArray(parsed.topicsDiscussed)
        ? parsed.topicsDiscussed.map(String)
        : [],
      linkedinAngles: Array.isArray(parsed.linkedinAngles)
        ? parsed.linkedinAngles.map(String)
        : [],
      summary: String(parsed.summary || ""),
    };
  } catch (error) {
    console.error("Failed to parse video insights:", error);
    throw new Error("Failed to parse video insights from AI response");
  }

  // Save insights to database
  await prisma.youTubeInsight.upsert({
    where: { videoId: video.id },
    create: {
      videoId: video.id,
      keyIdeas: insights.keyIdeas,
      claims: insights.claims,
      insights: insights.insights,
      implications: insights.implications,
      topicsDiscussed: insights.topicsDiscussed,
      linkedinAngles: insights.linkedinAngles,
      summary: insights.summary,
    },
    update: {
      keyIdeas: insights.keyIdeas,
      claims: insights.claims,
      insights: insights.insights,
      implications: insights.implications,
      topicsDiscussed: insights.topicsDiscussed,
      linkedinAngles: insights.linkedinAngles,
      summary: insights.summary,
    },
  });

  await prisma.youTubeVideo.update({
    where: { videoId },
    data: { processed: true },
  });

  await trackUsage({
    userId: "system",
    operationType: "video_processing",
    model: "gemini-2.0-flash",
    durationMs: Date.now() - startTime,
    metadata: { videoId, videoTitle: video.title },
  });

  return insights;
}

/**
 * Sync a YouTube channel: fetch new videos and process unprocessed ones.
 */
export async function syncChannel(channelId: string): Promise<{
  newVideos: number;
  processed: number;
}> {
  const channel = await prisma.youTubeChannel.findFirst({
    where: { channelId },
  });

  if (!channel) {
    throw new Error(`YouTube channel not found in DB: ${channelId}`);
  }

  // Fetch latest videos from YouTube
  const videos = await getLatestVideos(channelId, 10);

  let newVideos = 0;

  for (const video of videos) {
    const existing = await prisma.youTubeVideo.findUnique({
      where: { videoId: video.id },
    });

    if (!existing) {
      await prisma.youTubeVideo.create({
        data: {
          channelId: channel.id,
          videoId: video.id,
          title: video.title,
          description: video.description,
          url: video.url,
          publishedAt: new Date(video.publishedAt),
          thumbnail: video.thumbnail,
        },
      });
      newVideos++;
    }
  }

  // Process unprocessed videos
  const unprocessed = await prisma.youTubeVideo.findMany({
    where: { channelId: channel.id, processed: false },
    orderBy: { publishedAt: "desc" },
    take: 5,
  });

  let processed = 0;
  for (const video of unprocessed) {
    try {
      await processVideo(video.videoId);
      processed++;
    } catch (error) {
      console.error(`Failed to process video ${video.videoId}:`, error);
    }
  }

  // Update last sync time
  await prisma.youTubeChannel.update({
    where: { id: channel.id },
    data: { lastSyncAt: new Date() },
  });

  return { newVideos, processed };
}
