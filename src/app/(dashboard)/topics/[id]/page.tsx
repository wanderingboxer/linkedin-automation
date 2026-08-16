"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  ExternalLink,
  Lightbulb,
  PenSquare,
  Shield,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface TopicDetail {
  id: string;
  title: string;
  summary: string;
  category: string;
  whyTrending: string;
  whyRelevant: string;
  whyMatters: string;
  suggestedAngles: string[];
  sources: {
    id: string;
    title: string;
    url: string;
    publisher: string;
    publishedAt: string;
    sourceType: string;
    credibilityScore: number;
    snippet: string;
  }[];
  aiAnalysis?: {
    whyItMatters: string;
    argumentsFor: string[];
    argumentsAgainst: string[];
    whatsNext: string;
  };
  freshnessScore: number;
  relevanceScore: number;
  overallScore: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/topics/${params.id}`);
        if (!res.ok) {
          setError("Topic not found");
          return;
        }
        const data = await res.json();
        setTopic(data);
      } catch {
        setError("Failed to load topic");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{error || "Topic not found"}</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/topics")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Topics
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/topics")} className="mb-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> Topics
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wider">
              {topic.category}
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight">{topic.title}</h1>
            <p className="text-muted-foreground mt-2">{topic.summary}</p>
          </div>
          <Button onClick={() => router.push(`/create?topicId=${topic.id}`)}>
            <PenSquare className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Freshness", value: topic.freshnessScore, color: "bg-emerald-500" },
          { label: "Relevance", value: topic.relevanceScore, color: "bg-primary" },
          { label: "Overall", value: topic.overallScore, color: "bg-amber-500" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", s.color)}
                    style={{ width: `${(s.value ?? 0) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{Math.round((s.value ?? 0) * 100)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Why it's trending / relevant */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Why It&apos;s Trending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{topic.whyTrending}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Why It&apos;s Relevant to You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{topic.whyRelevant}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis */}
      {topic.aiAnalysis && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Why It Matters
              </p>
              <p className="text-sm">{topic.aiAnalysis.whyItMatters}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-2">
                  Arguments For
                </p>
                <ul className="space-y-1">
                  {topic.aiAnalysis.argumentsFor.map((a, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">+</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">
                  Arguments Against
                </p>
                <ul className="space-y-1">
                  {topic.aiAnalysis.argumentsAgainst.map((a, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">-</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                What&apos;s Next
              </p>
              <p className="text-sm">{topic.aiAnalysis.whatsNext}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Angles */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm">Suggested Post Angles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(topic.suggestedAngles ?? []).map((angle, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm">{angle}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    router.push(
                      `/create?topicId=${topic.id}&angle=${encodeURIComponent(angle)}`
                    )
                  }
                >
                  Use this
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sources */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Sources ({topic.sources?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(topic.sources ?? []).map((source) => (
              <div key={source.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{source.title}</span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{source.publisher}</span>
                    <span>-</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        (source.credibilityScore ?? 0) >= 0.7
                          ? "border-emerald-500/50 text-emerald-500"
                          : (source.credibilityScore ?? 0) >= 0.4
                          ? "border-amber-500/50 text-amber-500"
                          : "border-red-500/50 text-red-500"
                      )}
                    >
                      {(source.credibilityScore ?? 0) >= 0.7
                        ? "High credibility"
                        : (source.credibilityScore ?? 0) >= 0.4
                        ? "Medium credibility"
                        : "Low credibility"}
                    </Badge>
                  </div>
                  {source.snippet && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {source.snippet}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
