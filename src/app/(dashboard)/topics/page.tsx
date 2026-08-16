"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  Compass,
  RefreshCw,
  Search,
  TrendingUp,
  Zap,
  Filter,
  Loader2,
} from "lucide-react";

interface Topic {
  id: string;
  title: string;
  summary: string;
  category: string;
  whyTrending: string;
  whyRelevant: string;
  freshnessScore: number;
  relevanceScore: number;
  overallScore: number;
  createdAt: string;
}

const categories = [
  "All",
  "Technology",
  "Business",
  "Leadership",
  "AI",
  "Supply Chain",
  "Logistics",
  "SaaS",
  "Startups",
];

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export default function TopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/topics");
      if (res.ok) {
        const data = await res.json();
        setTopics(data.topics ?? []);
      }
    } catch {
      // API may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  async function discoverTopics() {
    setDiscovering(true);
    try {
      const res = await fetch("/api/topics/discover", { method: "POST" });
      if (res.ok) {
        await loadTopics();
      }
    } catch {
      // handle error
    } finally {
      setDiscovering(false);
    }
  }

  const filtered = topics.filter((t) => {
    if (filter !== "All" && t.category !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" />
            Topics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Discover trending topics relevant to your audience.
          </p>
        </div>
        <Button onClick={discoverTopics} disabled={discovering}>
          {discovering ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Discover New Topics
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Topic Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {topics.length === 0
                ? "No topics discovered yet. Click \"Discover New Topics\" to get started."
                : "No topics match your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((topic) => (
            <Card
              key={topic.id}
              className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => router.push(`/topics/${topic.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                    {topic.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Zap className="w-3 h-3" />
                    {Math.round((topic.overallScore ?? 0) * 100)}
                  </div>
                </div>
                <CardTitle className="text-sm mt-2 leading-snug group-hover:text-primary transition-colors">
                  {topic.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground line-clamp-2">{topic.summary}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span className="line-clamp-1">{topic.whyTrending}</span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Fresh</span>
                    <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(topic.freshnessScore ?? 0) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Relevant</span>
                    <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(topic.relevanceScore ?? 0) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
