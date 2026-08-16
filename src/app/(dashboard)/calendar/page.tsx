"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3X3,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";

interface CalendarPost {
  id: string;
  title: string;
  status: "DRAFT" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "FAILED";
  scheduledAt?: string;
  publishedAt?: string;
  content: string;
}

type View = "month" | "week" | "list";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-500",
  APPROVED: "bg-amber-500",
  SCHEDULED: "bg-blue-500",
  PUBLISHED: "bg-emerald-500",
  FAILED: "bg-red-500",
};

const STATUS_BG: Record<string, string> = {
  DRAFT: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  APPROVED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  SCHEDULED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PUBLISHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/posts?limit=100");
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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  function getPostsForDay(day: Date) {
    return posts.filter((p) => {
      const d = p.scheduledAt || p.publishedAt;
      return d && isSameDay(new Date(d), day);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Content Calendar
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Plan and schedule your LinkedIn posts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["month", "week", "list"] as View[]).map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "outline"}
              size="sm"
              onClick={() => setView(v)}
              className="text-xs capitalize"
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : view === "list" ? (
        /* List view */
        <div className="space-y-2">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No posts yet.
            </p>
          ) : (
            posts
              .filter((p) => p.scheduledAt || p.publishedAt)
              .sort((a, b) => {
                const da = a.scheduledAt || a.publishedAt || "";
                const db = b.scheduledAt || b.publishedAt || "";
                return new Date(db).getTime() - new Date(da).getTime();
              })
              .map((post) => (
                <Card key={post.id} className="bg-card border-border">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_COLORS[post.status])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {post.title || post.content.slice(0, 60)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(post.scheduledAt || post.publishedAt || ""),
                          "MMM d, yyyy h:mm a"
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", STATUS_BG[post.status])}>
                      {post.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      ) : (
        /* Month / Week grid */
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-medium text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-t border-l border-border">
            {days.map((day) => {
              const dayPosts = getPostsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-24 p-1.5 border-r border-b border-border",
                    !inMonth && "opacity-30",
                    today && "bg-primary/5"
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-medium mb-1",
                      today
                        ? "text-primary font-bold"
                        : "text-muted-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </p>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded truncate border",
                          STATUS_BG[post.status]
                        )}
                      >
                        {post.title || post.content.slice(0, 30)}
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-1">
                        +{dayPosts.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
