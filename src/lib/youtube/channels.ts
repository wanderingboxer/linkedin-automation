import type { ChannelInfo, VideoInfo } from "@/types";

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Missing YOUTUBE_API_KEY env var");
  return key;
}

/**
 * Get channel info from YouTube Data API v3.
 */
export async function getChannelInfo(
  channelId: string
): Promise<ChannelInfo> {
  const params = new URLSearchParams({
    part: "snippet,contentDetails,statistics",
    id: channelId,
    key: getApiKey(),
  });

  const response = await fetch(`${YOUTUBE_API_URL}/channels?${params}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YouTube channel fetch failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  const item = data.items?.[0];

  if (!item) {
    throw new Error(`YouTube channel not found: ${channelId}`);
  }

  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails?.default?.url || "",
    uploadsPlaylistId:
      item.contentDetails.relatedPlaylists.uploads || "",
    subscriberCount: item.statistics?.subscriberCount
      ? parseInt(item.statistics.subscriberCount)
      : undefined,
  };
}

/**
 * Get the latest videos from a channel's uploads playlist.
 */
export async function getLatestVideos(
  channelId: string,
  maxResults: number = 10
): Promise<VideoInfo[]> {
  // First get the uploads playlist ID
  const channel = await getChannelInfo(channelId);

  if (!channel.uploadsPlaylistId) {
    throw new Error(`No uploads playlist found for channel ${channelId}`);
  }

  const params = new URLSearchParams({
    part: "snippet",
    playlistId: channel.uploadsPlaylistId,
    maxResults: String(Math.min(maxResults, 50)),
    key: getApiKey(),
  });

  const response = await fetch(`${YOUTUBE_API_URL}/playlistItems?${params}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `YouTube playlist fetch failed: ${response.status} ${error}`
    );
  }

  const data = await response.json();

  return (data.items || []).map(
    (item: any): VideoInfo => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      publishedAt: item.snippet.publishedAt,
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.default?.url ||
        "",
    })
  );
}
