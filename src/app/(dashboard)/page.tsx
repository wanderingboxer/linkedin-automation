"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  FileText,
  CheckCircle2,
  Clock,
  Send,
  TrendingUp,
  Zap,
  ArrowRight,
  Sparkles,
  PenSquare,
} from "lucide-react";

interface TopicCard {
  id: string;
  title: string;
  whyTrending: string;
  whyRelevant: string;
  category: string;
  relevanceScore: number;
  trendScore: number;
  postPotential: number;
}

interface PipelineStats {
  drafts: number;
  approved: number;
  scheduled: number;
  published: number;
}

interface RecentPost {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [topics, setTopics] = useState<TopicCard[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [topicsRes, statsRes, postsRes] = await Promise.allSettled([
          fetch("/api/topics?limit=6&sort=score"),
          fetch("/api/posts/stats"),
          fetch("/api/posts?limit=5&sort=recent"),
        ]);

        if (topicsRes.status === "fulfilled" && topicsRes.value.ok) {
          const data = await topicsRes.value.json();
          setTopics(data.topics ?? []);
        }
        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
          const data = await statsRes.value.json();
          setStats(data);
        }
        if (postsRes.status === "fulfilled" && postsRes.value.ok) {
          const data = await postsRes.value.json();
          setRecentPosts(data.posts ?? []);
        }
      } catch {
        // API routes may not exist yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const greeting = getGreeting();
  const name = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your LinkedIn content today.
        </p>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))
        ) : (
          <>
            <StatCard
              icon={FileText}
              label="Drafts"
              value={stats?.drafts ?? 0}
              color="bg-zinc-500/10 text-zinc-400"
            />
            <StatCard
              icon={CheckCircle2}
              label="Approved"
              value={stats?.approved ?? 0}
              color="bg-amber-500/10 text-amber-400"
            />
            <StatCard
              icon={Clock}
              label="Scheduled"
              value={stats?.scheduled ?? 0}
              color="bg-blue-500/10 text-blue-400"
            />
            <StatCard
              icon={Send}
              label="Published"
              value={stats?.published ?? 0}
              color="bg-emerald-500/10 text-emerald-400"
            />
          </>
        )}
      </div>

      {/* Today's Opportunities */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Today&apos;s LinkedIn Opportunities
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/topics")}
          >
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <Card className="bg-card border-border border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No topics discovered yet. Head to Topics to discover trending content.
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push("/topics")}
              >
                Discover Topics
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <Card
                key={topic.id}
                className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => router.push(`/topics/${topic.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {topic.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <Zap className="w-3 h-3" />
                      {Math.round(topic.postPotential * 100)}%
                    </div>
                  </div>
                  <CardTitle className="text-sm mt-2 leading-snug group-hover:text-primary transition-colors">
                    {topic.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {topic.whyTrending}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {topic.whyRelevant}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${topic.relevanceScore * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Relevance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${topic.trendScore * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Trending</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/create?topicId=${topic.id}`);
                    }}
                  >
                    <PenSquare className="w-3 h-3 mr-1" />
                    Create Post
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent Posts */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : recentPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet. Create your first one!</p>
        ) : (
          <div className="space-y-2">
            {recentPosts.map((post) => (
              <Card
                key={post.id}
                className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer"
                onClick={() => router.push(`/drafts`)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        post.status === "PUBLISHED"
                          ? "bg-emerald-500"
                          : post.status === "SCHEDULED"
                          ? "bg-blue-500"
                          : "bg-zinc-500"
                      )}
                    />
                    <span className="text-sm font-medium">{post.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

