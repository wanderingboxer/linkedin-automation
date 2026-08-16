"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Loader2,
  Sparkles,
  User,
  Key,
  Video,
  FileText,
  PenSquare,
} from "lucide-react";

const TOTAL_STEPS = 7;

const DEFAULT_PILLARS = [
  "Industry Trends",
  "Leadership & Management",
  "Technology & Innovation",
  "Career Growth",
  "Supply Chain & Logistics",
  "AI & Automation",
  "SaaS & Product",
  "Startups & Entrepreneurship",
  "Data & Analytics",
  "Personal Branding",
];

const WRITING_STYLES = [
  { value: "insightful", label: "Insightful", desc: "Thoughtful analysis with unique perspectives" },
  { value: "analytical", label: "Analytical", desc: "Data-driven, fact-focused approach" },
  { value: "conversational", label: "Conversational", desc: "Casual, engaging, and relatable" },
  { value: "storytelling", label: "Storytelling", desc: "Narrative-driven with real experiences" },
  { value: "educational", label: "Educational", desc: "Teach and inform your audience" },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Profile
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("");

  // Step 4: YouTube
  const [ytChannel1, setYtChannel1] = useState("");
  const [ytChannel2, setYtChannel2] = useState("");

  // Step 5: Pillars
  const [selectedPillars, setSelectedPillars] = useState<string[]>([]);

  // Step 6: Writing style
  const [writingStyle, setWritingStyle] = useState("insightful");

  function togglePillar(pillar: string) {
    setSelectedPillars((prev) =>
      prev.includes(pillar)
        ? prev.filter((p) => p !== pillar)
        : [...prev, pillar]
    );
  }

  async function complete() {
    setSaving(true);
    try {
      await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { name, headline, bio, role },
          youtubeChannels: [ytChannel1, ytChannel2].filter(Boolean),
          contentPillars: selectedPillars,
          writingStyle,
        }),
      });
      router.push("/");
    } catch {
      // handle
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                i < step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          Step {step} of {TOTAL_STEPS}
        </p>

        {/* Step 1: Profile */}
        {step === 1 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Create Your Profile
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Tell us about yourself so we can personalize your content.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="bg-background border-border" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Professional Headline</label>
                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g., VP of Supply Chain at Acme Corp" className="bg-background border-border" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g., Product Manager, CTO, Founder" className="bg-background border-border" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="A brief description of your expertise and interests"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: LinkedIn */}
        {step === 2 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#0A66C2]" />
                Connect LinkedIn
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Connect your LinkedIn account to publish posts directly.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full bg-[#0A66C2] hover:bg-[#004182]"
                onClick={() => (window.location.href = "/api/auth/linkedin")}
              >
                <Globe className="w-4 h-4 mr-2" />
                Connect LinkedIn
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You can also connect later in Settings.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 3: API Keys info */}
        {step === 3 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                API Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                The platform uses Google Gemini for AI features. API keys are configured in your environment variables.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs font-mono text-muted-foreground">GOOGLE_AI_API_KEY</p>
                <p className="text-xs text-muted-foreground mt-1">Required for topic discovery, post generation, and image creation.</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs font-mono text-muted-foreground">YOUTUBE_API_KEY</p>
                <p className="text-xs text-muted-foreground mt-1">Required for YouTube channel monitoring.</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Set these in your .env file. You can proceed without them for now.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: YouTube */}
        {step === 4 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                YouTube Channels
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Add YouTube channels for content inspiration. We&apos;ll analyze recent videos for LinkedIn post ideas.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel 1</label>
                <Input value={ytChannel1} onChange={(e) => setYtChannel1(e.target.value)} placeholder="YouTube channel URL or handle" className="bg-background border-border" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel 2 (optional)</label>
                <Input value={ytChannel2} onChange={(e) => setYtChannel2(e.target.value)} placeholder="YouTube channel URL or handle" className="bg-background border-border" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Content Pillars */}
        {step === 5 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Content Pillars
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Select the themes you want to post about. You can customize these later.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_PILLARS.map((pillar) => (
                  <button
                    key={pillar}
                    onClick={() => togglePillar(pillar)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      selectedPillars.includes(pillar)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {selectedPillars.includes(pillar) && (
                      <Check className="w-3 h-3 inline mr-1.5" />
                    )}
                    {pillar}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {selectedPillars.length} selected
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Writing Style */}
        {step === 6 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PenSquare className="w-5 h-5 text-primary" />
                Writing Style
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose your default writing style. You can change this per post.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {WRITING_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setWritingStyle(style.value)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-colors",
                      writingStyle === style.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <p className="text-sm font-medium">{style.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{style.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 7: Complete */}
        {step === 7 && (
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
              </div>
              <CardTitle className="text-lg">You&apos;re all set!</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your LinkedIn Content Assistant is ready. Start discovering topics and creating content.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                {name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Profile: {name}</span>
                  </div>
                )}
                {selectedPillars.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>{selectedPillars.length} content pillars</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Style: {writingStyle}</span>
                </div>
              </div>
              <Button className="w-full" onClick={complete} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 7 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
            >
              {step === 2 || step === 3 || step === 4 ? "Skip" : "Next"}{" "}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
