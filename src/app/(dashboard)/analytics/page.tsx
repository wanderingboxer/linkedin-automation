"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { BarChart3, TrendingUp, PieChart, Calendar } from "lucide-react";

interface AnalyticsData {
  pillarDistribution: { name: string; count: number; color: string }[];
  postFrequency: { week: string; count: number }[];
  topTopics: { title: string; engagement: number }[];
  totalPosts: number;
  avgEngagement: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function BarChartSimple({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-primary/80 rounded-t-sm transition-all"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
          />
          <span className="text-[9px] text-muted-foreground truncate w-full text-center">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // API may not exist
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your LinkedIn content performance.
        </p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Content Pillar Distribution */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                Content Pillar Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.pillarDistribution && data.pillarDistribution.length > 0 ? (
                <div className="space-y-3">
                  {data.pillarDistribution.map((pillar, i) => {
                    const total = data.pillarDistribution.reduce(
                      (s, p) => s + p.count,
                      0
                    );
                    const pct = total > 0 ? (pillar.count / total) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{pillar.name}</span>
                          <span className="text-muted-foreground">
                            {pillar.count} ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${pct}%`,
                              opacity: 0.5 + (i * 0.1),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No data yet. Publish some posts to see distribution.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Post Frequency */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Post Frequency
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.postFrequency && data.postFrequency.length > 0 ? (
                <BarChartSimple
                  data={data.postFrequency.map((d) => ({
                    label: d.week,
                    value: d.count,
                  }))}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No posting history yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Top Topics */}
          <Card className="bg-card border-border md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Best Performing Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.topTopics && data.topTopics.length > 0 ? (
                <div className="space-y-2">
                  {data.topTopics.map((topic, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                    >
                      <span className="text-xs font-mono text-muted-foreground w-5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm flex-1">{topic.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {topic.engagement} engagement
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Publish posts to see performance data.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
