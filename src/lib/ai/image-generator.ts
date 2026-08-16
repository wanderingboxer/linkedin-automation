import { getImageModel, trackUsage } from "./gemini";

interface ImageResult {
  buffer: Buffer;
  prompt: string;
}

/**
 * Generate an editorial-style image for a LinkedIn post using Gemini's image generation.
 */
export async function generateImage(
  postContent: string,
  style?: string
): Promise<ImageResult> {
  const startTime = Date.now();
  const imageStyle = style || "premium editorial";

  const imagePrompt = buildImagePrompt(postContent, imageStyle);

  const model = getImageModel();

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: imagePrompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["image", "text"] as any,
    } as any,
  });

  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts;

  if (!parts) {
    throw new Error("No image generated — empty response from Gemini");
  }

  for (const part of parts) {
    const inlineData = (part as any).inlineData;
    if (inlineData?.mimeType?.startsWith("image/")) {
      const buffer = Buffer.from(inlineData.data, "base64");

      await trackUsage({
        userId: "system",
        operationType: "image_generation",
        model: "gemini-2.0-flash-preview-image-generation",
        durationMs: Date.now() - startTime,
        metadata: { style: imageStyle, promptLength: imagePrompt.length },
      });

      return { buffer, prompt: imagePrompt };
    }
  }

  throw new Error("No image data found in Gemini response");
}

function buildImagePrompt(postContent: string, style: string): string {
  // Extract the core theme from the post for the image
  const firstLine = postContent.split("\n")[0].slice(0, 200);

  return `Create a ${style} illustration for a LinkedIn post. The image should be professional, modern, and visually striking.

Post topic: ${firstLine}

Style requirements:
- Clean, minimalist design with a premium tech/business aesthetic
- Abstract or conceptual — NOT literal stock photo style
- Bold color palette with depth and contrast
- Suitable as a LinkedIn post banner (1200x627 aspect ratio)
- No text, watermarks, or logos in the image
- Professional enough for a business audience
- Evokes the theme without being cliché

Generate the image now.`;
}
