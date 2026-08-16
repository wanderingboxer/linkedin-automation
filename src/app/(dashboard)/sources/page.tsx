"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { Rss, Video, RefreshCw, Loader2, ExternalLink, Lightbulb } from "lucide-react";

interface VideoSource {
  id: string;
  title: string;
  channelTitle: string;
  url: string;
  publishedAt: string;
  thumbnail: string;
  insights?: {
    keyIdeas: string[];
    linkedinAngles: string[];
    summary: string;
  };
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export default function SourcesPage() {
  const [videos, setVideos] = useState<VideoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/sources/youtube");
        if (res.ok) {
          const data = await res.json();
          setVideos(data.videos ?? []);
        }
      } catch {
        // API may not exist
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sources/youtube/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos ?? videos);
      }
    } catch {
      // handle
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Rss className="w-6 h-6 text-primary" />
            Sources
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            YouTube channels and video insights for content inspiration.
          </p>
        </div>
        <Button onClick={sync} disabled={syncing}>
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sync Videos
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No videos yet. Configure YouTube channels in Settings, then sync.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <Card key={video.id} className="bg-card border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="flex gap-4 p-4">
                  {video.thumbnail && (
                    <div className="w-40 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {video.channelTitle} &middot;{" "}
                          {new Date(video.publishedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    {video.insights && (
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === video.id ? null : video.id)
                        }
                        className="text-xs text-primary mt-2 flex items-center gap-1"
                      >
                        <Lightbulb className="w-3 h-3" />
                        {expandedId === video.id ? "Hide insights" : "View insights"}
                      </button>
                    )}
                  </div>
                </div>

                {expandedId === video.id && video.insights && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Summary
                      </p>
                      <p className="text-sm">{video.insights.summary}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Key Ideas
                      </p>
                      <ul className="space-y-1">
                        {video.insights.keyIdeas.map((idea, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">-</span> {idea}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        LinkedIn Angles
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {video.insights.linkedinAngles.map((angle, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {angle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
