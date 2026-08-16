"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  Settings,
  User,
  FileText,
  Newspaper,
  Video,
  Globe,
  Sparkles,
  Clock,
  Loader2,
  Plus,
  X,
  GripVertical,
  Save,
} from "lucide-react";

type Tab = "profile" | "content" | "news" | "youtube" | "linkedin" | "ai" | "scheduling";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "content", label: "Content", icon: FileText },
  { key: "news", label: "News", icon: Newspaper },
  { key: "youtube", label: "YouTube", icon: Video },
  { key: "linkedin", label: "LinkedIn", icon: Globe },
  { key: "ai", label: "AI", icon: Sparkles },
  { key: "scheduling", label: "Scheduling", icon: Clock },
];

interface ProfileData {
  name: string;
  headline: string;
  bio: string;
  role: string;
  skills: string[];
  industries: string[];
  targetAudience: string;
}

interface ContentPillar {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface SettingsData {
  profile: ProfileData;
  pillars: ContentPillar[];
  tone: string;
  hashtagPrefs: string;
  freshnessWindow: number;
  sourcePreferences: string;
  excludedTopics: string;
  youtubeChannel1: string;
  youtubeChannel2: string;
  linkedinConnected: boolean;
  defaultVisibility: string;
  aiModel: string;
  imageModel: string;
  timezone: string;
  defaultPostTimes: string[];
}

const DEFAULT_SETTINGS: SettingsData = {
  profile: {
    name: "",
    headline: "",
    bio: "",
    role: "",
    skills: [],
    industries: [],
    targetAudience: "",
  },
  pillars: [],
  tone: "insightful",
  hashtagPrefs: "",
  freshnessWindow: 48,
  sourcePreferences: "",
  excludedTopics: "",
  youtubeChannel1: "",
  youtubeChannel2: "",
  linkedinConnected: false,
  defaultVisibility: "PUBLIC",
  aiModel: "gemini-2.0-flash",
  imageModel: "gemini-2.0-flash",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  defaultPostTimes: ["09:00", "12:00", "17:00"],
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newPillarName, setNewPillarName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...DEFAULT_SETTINGS, ...data });
        }
      } catch {
        // API may not exist
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch {
      // handle
    } finally {
      setSaving(false);
    }
  }

  function updateProfile(key: keyof ProfileData, value: string | string[]) {
    setSettings((s) => ({
      ...s,
      profile: { ...s.profile, [key]: value },
    }));
  }

  function addPillar() {
    if (!newPillarName.trim()) return;
    setSettings((s) => ({
      ...s,
      pillars: [
        ...s.pillars,
        {
          id: crypto.randomUUID(),
          name: newPillarName.trim(),
          description: "",
          enabled: true,
        },
      ],
    }));
    setNewPillarName("");
  }

  function removePillar(id: string) {
    setSettings((s) => ({
      ...s,
      pillars: s.pillars.filter((p) => p.id !== id),
    }));
  }

  function togglePillar(id: string) {
    setSettings((s) => ({
      ...s,
      pillars: s.pillars.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    }));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Settings
          </h1>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Tab nav */}
        <div className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  tab === t.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {/* Profile */}
          {tab === "profile" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Name
                    </label>
                    <Input
                      value={settings.profile.name}
                      onChange={(e) => updateProfile("name", e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Role
                    </label>
                    <Input
                      value={settings.profile.role}
                      onChange={(e) => updateProfile("role", e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Headline
                  </label>
                  <Input
                    value={settings.profile.headline}
                    onChange={(e) => updateProfile("headline", e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Bio
                  </label>
                  <textarea
                    value={settings.profile.bio}
                    onChange={(e) => updateProfile("bio", e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Target Audience
                  </label>
                  <Input
                    value={settings.profile.targetAudience}
                    onChange={(e) => updateProfile("targetAudience", e.target.value)}
                    placeholder="e.g., Supply chain professionals, logistics managers..."
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Skills
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {settings.profile.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {skill}
                        <button
                          onClick={() =>
                            updateProfile(
                              "skills",
                              settings.profile.skills.filter((_, j) => j !== i)
                            )
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add skill"
                      className="bg-background border-border max-w-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSkill.trim()) {
                          updateProfile("skills", [
                            ...settings.profile.skills,
                            newSkill.trim(),
                          ]);
                          setNewSkill("");
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (newSkill.trim()) {
                          updateProfile("skills", [
                            ...settings.profile.skills,
                            newSkill.trim(),
                          ]);
                          setNewSkill("");
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Industries
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {settings.profile.industries.map((ind, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {ind}
                        <button
                          onClick={() =>
                            updateProfile(
                              "industries",
                              settings.profile.industries.filter((_, j) => j !== i)
                            )
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newIndustry}
                      onChange={(e) => setNewIndustry(e.target.value)}
                      placeholder="Add industry"
                      className="bg-background border-border max-w-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newIndustry.trim()) {
                          updateProfile("industries", [
                            ...settings.profile.industries,
                            newIndustry.trim(),
                          ]);
                          setNewIndustry("");
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (newIndustry.trim()) {
                          updateProfile("industries", [
                            ...settings.profile.industries,
                            newIndustry.trim(),
                          ]);
                          setNewIndustry("");
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          {tab === "content" && (
            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">Content Pillars</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {settings.pillars.map((pillar) => (
                    <div
                      key={pillar.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{pillar.name}</p>
                      </div>
                      <button
                        onClick={() => togglePillar(pillar.id)}
                        className={cn(
                          "w-8 h-5 rounded-full transition-colors relative",
                          pillar.enabled ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                            pillar.enabled ? "left-3.5" : "left-0.5"
                          )}
                        />
                      </button>
                      <button onClick={() => removePillar(pillar.id)}>
                        <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newPillarName}
                      onChange={(e) => setNewPillarName(e.target.value)}
                      placeholder="New pillar name"
                      className="bg-background border-border"
                      onKeyDown={(e) => e.key === "Enter" && addPillar()}
                    />
                    <Button variant="outline" onClick={addPillar}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Default Tone
                    </label>
                    <select
                      value={settings.tone}
                      onChange={(e) => setSettings((s) => ({ ...s, tone: e.target.value }))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="insightful">Insightful</option>
                      <option value="analytical">Analytical</option>
                      <option value="conversational">Conversational</option>
                      <option value="contrarian">Contrarian</option>
                      <option value="storytelling">Storytelling</option>
                      <option value="educational">Educational</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Hashtag Preferences
                    </label>
                    <Input
                      value={settings.hashtagPrefs}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, hashtagPrefs: e.target.value }))
                      }
                      placeholder="#SupplyChain #Logistics #AI"
                      className="bg-background border-border"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* News */}
          {tab === "news" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">News Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Freshness Window (hours)
                  </label>
                  <Input
                    type="number"
                    value={settings.freshnessWindow}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        freshnessWindow: parseInt(e.target.value) || 48,
                      }))
                    }
                    className="bg-background border-border max-w-32"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Only consider news published within this many hours.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Preferred Sources
                  </label>
                  <textarea
                    value={settings.sourcePreferences}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, sourcePreferences: e.target.value }))
                    }
                    rows={3}
                    placeholder="One source per line (e.g., TechCrunch, Reuters)"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Excluded Topics
                  </label>
                  <textarea
                    value={settings.excludedTopics}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, excludedTopics: e.target.value }))
                    }
                    rows={3}
                    placeholder="Topics to never suggest (one per line)"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* YouTube */}
          {tab === "youtube" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">YouTube Channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Channel 1
                  </label>
                  <Input
                    value={settings.youtubeChannel1}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, youtubeChannel1: e.target.value }))
                    }
                    placeholder="YouTube channel URL or ID"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Channel 2
                  </label>
                  <Input
                    value={settings.youtubeChannel2}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, youtubeChannel2: e.target.value }))
                    }
                    placeholder="YouTube channel URL or ID"
                    className="bg-background border-border"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* LinkedIn */}
          {tab === "linkedin" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">LinkedIn Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/30 border border-border">
                  <Globe className="w-6 h-6 text-[#0A66C2]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {settings.linkedinConnected
                        ? "LinkedIn Connected"
                        : "LinkedIn Not Connected"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {settings.linkedinConnected
                        ? "Your account is linked and ready to publish."
                        : "Connect to publish posts directly."}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      settings.linkedinConnected ? "bg-emerald-500" : "bg-zinc-500"
                    )}
                  />
                </div>
                <Button
                  variant={settings.linkedinConnected ? "outline" : "default"}
                  onClick={() => {
                    window.location.href = "/api/auth/linkedin";
                  }}
                >
                  {settings.linkedinConnected ? "Reconnect" : "Connect LinkedIn"}
                </Button>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Default Post Visibility
                  </label>
                  <select
                    value={settings.defaultVisibility}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, defaultVisibility: e.target.value }))
                    }
                    className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="CONNECTIONS">Connections Only</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI */}
          {tab === "ai" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">AI Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Text Generation Model
                  </label>
                  <select
                    value={settings.aiModel}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, aiModel: e.target.value }))
                    }
                    className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-2.5-pro-preview-06-05">Gemini 2.5 Pro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Image Generation Model
                  </label>
                  <select
                    value={settings.imageModel}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, imageModel: e.target.value }))
                    }
                    className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scheduling */}
          {tab === "scheduling" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Scheduling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Timezone
                  </label>
                  <Input
                    value={settings.timezone}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, timezone: e.target.value }))
                    }
                    className="bg-background border-border max-w-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Default Post Times
                  </label>
                  <div className="space-y-2">
                    {settings.defaultPostTimes.map((time, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={time}
                          onChange={(e) => {
                            const times = [...settings.defaultPostTimes];
                            times[i] = e.target.value;
                            setSettings((s) => ({ ...s, defaultPostTimes: times }));
                          }}
                          className="bg-background border-border w-32"
                        />
                        <button
                          onClick={() =>
                            setSettings((s) => ({
                              ...s,
                              defaultPostTimes: s.defaultPostTimes.filter(
                                (_, j) => j !== i
                              ),
                            }))
                          }
                        >
                          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          defaultPostTimes: [...s.defaultPostTimes, "12:00"],
                        }))
                      }
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Time
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
