import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { createTextPost, createImagePost, uploadImage } from "@/lib/linkedin/publisher";

const MAX_ATTEMPTS = 3;

export async function POST(request: Request) {
  return handleScheduler(request);
}

// Vercel Cron uses GET
export async function GET(request: Request) {
  return handleScheduler(request);
}

async function handleScheduler(request: Request) {
  try {
    // Verify authorization — supports both x-cron-secret and Vercel's Authorization: Bearer
    const cronSecret = request.headers.get("x-cron-secret")
      || request.headers.get("authorization")?.replace("Bearer ", "");

    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const dueJobs = await prisma.scheduledJob.findMany({
      where: {
        executeAt: { lte: now },
        status: "PENDING",
        attempts: { lt: MAX_ATTEMPTS },
      },
      take: 10,
    });

    const results: Array<{ jobId: string; postId: string; status: string; error?: string }> = [];

    for (const job of dueJobs) {
      try {
        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: { attempts: job.attempts + 1 },
        });

        const post = await prisma.post.findUnique({
          where: { id: job.postId },
          include: {
            user: { include: { linkedinConnection: true } },
            images: { where: { active: true, approved: true }, take: 1 },
          },
        });

        if (!post || post.status !== "SCHEDULED") {
          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: { status: "CANCELLED", lastError: "Post not in SCHEDULED status" },
          });
          results.push({ jobId: job.id, postId: job.postId, status: "CANCELLED" });
          continue;
        }

        const connection = post.user.linkedinConnection;
        if (!connection || !connection.connected || connection.expiresAt < now) {
          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: { status: "FAILED", lastError: "LinkedIn not connected or token expired" },
          });
          results.push({ jobId: job.id, postId: job.postId, status: "FAILED", error: "LinkedIn not connected" });
          continue;
        }

        // Verify approval hashes
        const currentTextHash = createHash("sha256").update(post.content).digest("hex");
        if (post.approvedTextHash !== currentTextHash) {
          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: { status: "FAILED", lastError: "Text hash mismatch — content changed after approval" },
          });
          results.push({ jobId: job.id, postId: job.postId, status: "FAILED", error: "Text hash mismatch" });
          continue;
        }

        const approvedImage = post.images[0];
        if (approvedImage && post.approvedImageHash) {
          const currentImageHash = createHash("sha256").update(approvedImage.filePath).digest("hex");
          if (post.approvedImageHash !== currentImageHash) {
            await prisma.scheduledJob.update({
              where: { id: job.id },
              data: { status: "FAILED", lastError: "Image hash mismatch" },
            });
            results.push({ jobId: job.id, postId: job.postId, status: "FAILED", error: "Image hash mismatch" });
            continue;
          }
        }

        // Check idempotency — don't publish if already published
        if (post.linkedinPostUrn) {
          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: { status: "COMPLETED" },
          });
          results.push({ jobId: job.id, postId: job.postId, status: "ALREADY_PUBLISHED" });
          continue;
        }

        // Publish to LinkedIn
        const idempotencyKey = uuidv4();
        const attempt = await prisma.publishAttempt.create({
          data: { postId: post.id, idempotencyKey, status: "PENDING" },
        });

        let postUrn: string;
        if (approvedImage) {
          const imageUrl = approvedImage.filePath;
          const imageResponse = await fetch(
            imageUrl.startsWith("http") ? imageUrl : `${process.env.APP_URL}${imageUrl}`
          );
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const imageUrn = await uploadImage(
            connection.accessToken,
            connection.memberUrn!,
            imageBuffer
          );
          postUrn = await createImagePost(
            connection.accessToken,
            connection.memberUrn!,
            post.content,
            imageUrn
          );
        } else {
          postUrn = await createTextPost(
            connection.accessToken,
            connection.memberUrn!,
            post.content
          );
        }

        await prisma.publishAttempt.update({
          where: { id: attempt.id },
          data: { status: "SUCCESS", linkedinPostId: postUrn },
        });

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            linkedinPostUrn: postUrn,
          },
        });

        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: { status: "COMPLETED" },
        });

        results.push({ jobId: job.id, postId: job.postId, status: "COMPLETED" });
      } catch (jobError) {
        const errorMsg = jobError instanceof Error ? jobError.message : "Unknown error";
        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: { lastError: errorMsg },
        });
        results.push({ jobId: job.id, postId: job.postId, status: "ERROR", error: errorMsg });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    console.error("Scheduler process error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
