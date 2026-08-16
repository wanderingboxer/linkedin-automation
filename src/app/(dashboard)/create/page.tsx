"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Edit3,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Minus,
  PenSquare,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

// ── Types ──

interface Topic {
  id: string;
  title: string;
  summary: string;
  category: string;
  suggestedAngles?: string[];
}

interface PostVersion {
  id: string;
  versionNumber: number;
  content: string;
  tone: string;
  length: string;
  createdAt: string;
}

interface FactCheck {
  status: "pass" | "warning" | "fail";
  claims: { claim: string; verified: boolean; confidence: number; note?: string }[];
  overallConfidence: number;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
}

// ── Constants ──

const TONES = [
  { value: "insightful", label: "Insightful", desc: "Thoughtful analysis" },
  { value: "analytical", label: "Analytical", desc: "Data-driven perspective" },
  { value: "conversational", label: "Conversational", desc: "Casual and engaging" },
  { value: "contrarian", label: "Contrarian", desc: "Challenge the consensus" },
  { value: "storytelling", label: "Storytelling", desc: "Narrative-driven" },
  { value: "educational", label: "Educational", desc: "Teach your audience" },
];

const LENGTHS = [
  { value: "short", label: "Short", desc: "~500 chars, punchy" },
  { value: "medium", label: "Medium", desc: "~1000 chars, balanced" },
  { value: "long", label: "Long", desc: "~1500 chars, in-depth" },
];

const REJECTION_REASONS = [
  "Too generic",
  "Wrong tone",
  "Not engaging enough",
  "Too long",
  "Too short",
  "Weak hook",
  "Not my style",
  "Factually off",
];

type Step = "topic" | "configure" | "preview" | "factcheck" | "image" | "review";

const STEPS: { key: Step; label: string }[] = [
  { key: "topic", label: "Topic" },
  { key: "configure", label: "Configure" },
  { key: "preview", label: "Preview" },
  { key: "factcheck", label: "Fact Check" },
  { key: "image", label: "Image" },
  { key: "review", label: "Review" },
];

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTopicId = searchParams.get("topicId");
  const preselectedAngle = searchParams.get("angle");

  // State machine
  const [step, setStep] = useState<Step>("topic");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [tone, setTone] = useState("insightful");
  const [length, setLength] = useState("medium");
  const [angle, setAngle] = useState(preselectedAngle ?? "");
  const [generating, setGenerating] = useState(false);
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<PostVersion | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [textApproved, setTextApproved] = useState(false);
  const [factCheck, setFactCheck] = useState<FactCheck | null>(null);
  const [factChecking, setFactChecking] = useState(false);
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageApproved, setImageApproved] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [showRejectionPicker, setShowRejectionPicker] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Load topics
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/topics?limit=20&sort=score");
        if (res.ok) {
          const data = await res.json();
          setTopics(data.topics ?? []);

          if (preselectedTopicId) {
            const found = (data.topics ?? []).find(
              (t: Topic) => t.id === preselectedTopicId
            );
            if (found) {
              setSelectedTopic(found);
              setStep("configure");
            }
          }
        }
      } catch {
        // API may not exist yet
      } finally {
        setLoadingTopics(false);
      }
    }
    load();
  }, [preselectedTopicId]);

  // Generate post
  const generatePost = useCallback(
    async (feedback?: string) => {
      if (!selectedTopic) return;
      setGenerating(true);
      setTextApproved(false);
      try {
        const res = await fetch("/api/posts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId: selectedTopic.id,
            tone,
            length,
            angle,
            feedback,
            previousVersions: versions.map((v) => v.content),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const newVersion: PostVersion = {
            id: data.id ?? crypto.randomUUID(),
            versionNumber: versions.length + 1,
            content: data.content,
            tone,
            length,
            createdAt: new Date().toISOString(),
          };
          setVersions((prev) => [...prev, newVersion]);
          setActiveVersion(newVersion);
          setEditedContent(data.content);
          setGenerationCount((c) => c + 1);
          if (step === "configure") setStep("preview");
        }
      } catch {
        // handle
      } finally {
        setGenerating(false);
      }
    },
    [selectedTopic, tone, length, angle, versions, step]
  );

  // Regenerate with feedback
  function handleRegenerate(reason?: string) {
    setShowRejectionPicker(false);
    setRejectionReason(reason ?? null);
    generatePost(reason);
  }

  // Quick actions
  function handleQuickAction(action: string) {
    generatePost(action);
  }

  // Fact check
  async function runFactCheck() {
    if (!activeVersion) return;
    setFactChecking(true);
    try {
      const res = await fetch("/api/posts/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });
      if (res.ok) {
        const data = await res.json();
        setFactCheck(data);
      }
    } catch {
      // handle
    } finally {
      setFactChecking(false);
    }
  }

  // Generate image
  async function generateImage(feedback?: string) {
    setGeneratingImage(true);
    setImageApproved(false);
    try {
      const res = await fetch("/api/posts/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editedContent,
          topicTitle: selectedTopic?.title,
          feedback,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setImage(data);
      }
    } catch {
      // handle
    } finally {
      setGeneratingImage(false);
    }
  }

  // Publish
  async function handlePublish() {
    setPublishing(true);
    try {
      await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editedContent,
          imageId: image?.id,
          topicId: selectedTopic?.id,
        }),
      });
      router.push("/published");
    } catch {
      // handle
    } finally {
      setPublishing(false);
    }
  }

  // Schedule
  async function handleSchedule() {
    if (!scheduleDate) return;
    setScheduling(true);
    try {
      await fetch("/api/posts/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editedContent,
          imageId: image?.id,
          topicId: selectedTopic?.id,
          scheduledAt: `${scheduleDate}T${scheduleTime}:00`,
        }),
      });
      router.push("/calendar");
    } catch {
      // handle
    } finally {
      setScheduling(false);
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PenSquare className="w-6 h-6 text-primary" />
            Create Post
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-assisted LinkedIn post creation
          </p>
        </div>
        {generationCount > 0 && (
          <Badge variant="outline" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            {generationCount} generation{generationCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <button
              onClick={() => {
                // Only allow going back
                if (i <= stepIndex) setStep(s.key);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                step === s.key
                  ? "bg-primary text-primary-foreground"
                  : i < stepIndex
                  ? "bg-primary/10 text-primary cursor-pointer"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {i < stepIndex && <Check className="w-3 h-3" />}
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className="w-4 h-px bg-border" />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Step 1: Topic Selection */}
          {step === "topic" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Select a Topic</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTopics ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : topics.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">
                      No topics available. Discover some first.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => router.push("/topics")}
                    >
                      Go to Topics
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => {
                          setSelectedTopic(topic);
                          setStep("configure");
                        }}
                        className={cn(
                          "w-full text-left p-4 rounded-lg border transition-colors",
                          selectedTopic?.id === topic.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-secondary/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{topic.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {topic.summary}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {topic.category}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Configure */}
          {step === "configure" && (
            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">
                    Configure your post about: {selectedTopic?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tone */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Tone</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {TONES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTone(t.value)}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-colors",
                            tone === t.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <p className="text-sm font-medium">{t.label}</p>
                          <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Length */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Length</label>
                    <div className="grid grid-cols-3 gap-2">
                      {LENGTHS.map((l) => (
                        <button
                          key={l.value}
                          onClick={() => setLength(l.value)}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-colors",
                            length === l.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <p className="text-sm font-medium">{l.label}</p>
                          <p className="text-[10px] text-muted-foreground">{l.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Angle */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Angle</label>
                    <Input
                      placeholder="e.g., Personal experience with this trend..."
                      value={angle}
                      onChange={(e) => setAngle(e.target.value)}
                      className="bg-background border-border"
                    />
                    {selectedTopic?.suggestedAngles &&
                      selectedTopic.suggestedAngles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedTopic.suggestedAngles.slice(0, 5).map((a, i) => (
                            <button
                              key={i}
                              onClick={() => setAngle(a)}
                              className={cn(
                                "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                                angle === a
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/30"
                              )}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => generatePost()}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Post
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && activeVersion && (
            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Post Preview</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      v{activeVersion.versionNumber} / {tone} / {length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <div>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full min-h-[300px] p-4 rounded-lg bg-background border border-border text-sm leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => setEditing(false)}>
                          <Check className="w-3 h-3 mr-1" /> Done Editing
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditedContent(activeVersion.content);
                            setEditing(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {editedContent}
                      </p>
                      <p className="text-xs text-muted-foreground mt-3">
                        {editedContent.length} characters
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setTextApproved(true);
                    setStep("factcheck");
                    runFactCheck();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-4 h-4 mr-1" /> Approve Draft
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectionPicker(true)}
                  disabled={generating}
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
                </Button>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit3 className="w-4 h-4 mr-1" /> Edit
                </Button>
              </div>

              {/* Quick refinement actions */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Change Tone",
                  "Make Shorter",
                  "Make Stronger",
                  "More Contrarian",
                  "Better Hook",
                  "Remove Fluff",
                ].map((action) => (
                  <Button
                    key={action}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleQuickAction(action)}
                    disabled={generating}
                    className="text-xs"
                  >
                    {action}
                  </Button>
                ))}
              </div>

              {/* Rejection reason picker */}
              {showRejectionPicker && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-3">
                      Why didn&apos;t you like this?
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {REJECTION_REASONS.map((reason) => (
                        <Button
                          key={reason}
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate(reason)}
                          className="text-xs"
                        >
                          {reason}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRejectionPicker(false)}
                        className="text-xs"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Fact Check */}
          {step === "factcheck" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Fact Check
                </CardTitle>
              </CardHeader>
              <CardContent>
                {factChecking ? (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Verifying claims...
                    </p>
                  </div>
                ) : factCheck ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={cn(
                          factCheck.status === "pass"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : factCheck.status === "warning"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            : "bg-red-500/10 text-red-500 border-red-500/30"
                        )}
                      >
                        {factCheck.status === "pass"
                          ? "Verified"
                          : factCheck.status === "warning"
                          ? "Needs Review"
                          : "Unsupported Claims"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Confidence: {Math.round(factCheck.overallConfidence * 100)}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      {factCheck.claims.map((claim, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30"
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                              claim.verified
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-amber-500/10 text-amber-500"
                            )}
                          >
                            {claim.verified ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm">{claim.claim}</p>
                            {claim.note && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {claim.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button onClick={() => setStep("image")} className="w-full">
                      Continue to Image <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">
                      No fact check data available.
                    </p>
                    <Button className="mt-3" onClick={runFactCheck}>
                      Run Fact Check
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Image */}
          {step === "image" && (
            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Post Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {generatingImage ? (
                    <div className="flex items-center gap-3 py-16 justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Generating image...
                      </p>
                    </div>
                  ) : image ? (
                    <div className="space-y-4">
                      <div className="rounded-lg overflow-hidden border border-border bg-secondary/30">
                        <img
                          src={image.url}
                          alt="Generated post image"
                          className="w-full aspect-[1200/627] object-cover"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Prompt: {image.prompt}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">
                        Generate an image to accompany your post.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2">
                {!image ? (
                  <Button onClick={() => generateImage()} disabled={generatingImage}>
                    <Sparkles className="w-4 h-4 mr-1" /> Generate Image
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        setImageApproved(true);
                        setStep("review");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Check className="w-4 h-4 mr-1" /> Approve Image
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => generateImage()}
                      disabled={generatingImage}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
                    </Button>
                  </>
                )}
                {image && (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Change Style",
                      "More Minimal",
                      "More Editorial",
                      "Different Concept",
                    ].map((action) => (
                      <Button
                        key={action}
                        variant="secondary"
                        size="sm"
                        onClick={() => generateImage(action)}
                        disabled={generatingImage}
                        className="text-xs"
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setStep("review")}
                  className="ml-auto text-muted-foreground"
                >
                  Skip Image <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 6: Final Review */}
          {step === "review" && (
            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">Final Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Post preview */}
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {editedContent}
                    </p>
                  </div>

                  {/* Image preview */}
                  {image && (
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img
                        src={image.url}
                        alt="Post image"
                        className="w-full aspect-[1200/627] object-cover"
                      />
                    </div>
                  )}

                  {/* Source topic */}
                  {selectedTopic && (
                    <div className="text-xs text-muted-foreground">
                      Topic: {selectedTopic.title}
                    </div>
                  )}

                  {/* Fact check status */}
                  {factCheck && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          factCheck.status === "pass"
                            ? "border-emerald-500/50 text-emerald-500"
                            : "border-amber-500/50 text-amber-500"
                        )}
                      >
                        Fact check: {factCheck.status}
                      </Badge>
                    </div>
                  )}

                  {/* Schedule date */}
                  <div className="flex items-center gap-2 pt-2">
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-auto bg-background border-border"
                    />
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-auto bg-background border-border"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/drafts")}
                >
                  Cancel
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={handlePublish}
                  disabled={!textApproved || (!imageApproved && !!image) || publishing}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {publishing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Send className="w-4 h-4 mr-1" />
                  )}
                  Publish Now
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSchedule}
                  disabled={
                    !textApproved ||
                    (!imageApproved && !!image) ||
                    !scheduleDate ||
                    scheduling
                  }
                >
                  {scheduling ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Clock className="w-4 h-4 mr-1" />
                  )}
                  Schedule
                </Button>
              </div>

              {(!textApproved || (image && !imageApproved)) && (
                <p className="text-xs text-amber-500">
                  {!textApproved && !imageApproved
                    ? "Approve both text and image before publishing."
                    : !textApproved
                    ? "Approve the text before publishing."
                    : "Approve the image before publishing."}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Version history sidebar */}
        {versions.length > 0 && step !== "topic" && step !== "configure" && (
          <div className="w-56 shrink-0 hidden lg:block">
            <div className="sticky top-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Version History
              </p>
              <div className="space-y-1.5">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setActiveVersion(v);
                      setEditedContent(v.content);
                      if (step !== "preview") setStep("preview");
                    }}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg text-xs transition-colors",
                      activeVersion?.id === v.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">v{v.versionNumber}</span>
                      <span className="text-[10px]">{v.tone}</span>
                    </div>
                    <p className="line-clamp-2 mt-1 text-[11px] opacity-70">
                      {v.content.slice(0, 80)}...
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
