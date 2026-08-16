import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import type { AIUsageRecord } from "@/types";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY env var");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function getTextModel() {
  return getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
}

export function getImageModel() {
  return getClient().getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" });
}

/**
 * Generate text using Gemini.
 */
export async function generateText(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const model = systemPrompt
    ? getClient().getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemPrompt,
      })
    : getTextModel();

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

/**
 * Generate text with Google Search grounding for up-to-date information.
 */
export async function generateWithGrounding(prompt: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ googleSearch: {} } as any],
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Track AI usage in the database for cost monitoring.
 */
export async function trackUsage(record: AIUsageRecord): Promise<void> {
  try {
    await prisma.aIInteraction.create({
      data: {
        userId: record.userId,
        operationType: record.operationType,
        model: record.model,
        inputTokens: record.inputTokens ?? null,
        outputTokens: record.outputTokens ?? null,
        estimatedCost: record.estimatedCost ?? null,
        durationMs: record.durationMs ?? null,
        metadata: record.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to track AI usage:", error);
  }
}
