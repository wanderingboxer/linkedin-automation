"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { Send, ExternalLink, ThumbsUp, MessageSquare, Eye } from "lucide-react";

interface PublishedPost {
  id: string;
  content: string;
  publishedAt: string;
  linkedinPostId?: string;
  linkedinUrl?: string;
  metrics?: { likes: number; comments: number; views: number };
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export default function PublishedPage() {
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/posts?status=PUBLISHED&sort=recent");
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts ?? []);
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
          <Send className="w-6 h-6 text-primary" />
          Published
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {posts.length} published post{posts.length !== 1 ? "s" : ""}.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Send className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No published posts yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed line-clamp-3 whitespace-pre-wrap">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      {post.linkedinUrl && (
                        <a
                          href={post.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          View on LinkedIn <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  {post.metrics && (
                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {post.metrics.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {post.metrics.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {post.metrics.views}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
