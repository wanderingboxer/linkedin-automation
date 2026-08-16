import { prisma } from "@/lib/db";
import { createTextPost, createImagePost, uploadImage } from "@/lib/linkedin/publisher";
import * as fs from "fs/promises";
import { randomUUID } from "crypto";
import type { ScheduleResult } from "@/types";

/**
 * Schedule a post for future publishing.
 */
export async function schedulePost(
  postId: string,
  executeAt: Date
): Promise<ScheduleResult> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error(`Post ${postId} not found`);

  const job = await prisma.scheduledJob.upsert({
    where: { postId },
    create: {
      postId,
      executeAt,
      status: "PENDING",
    },
    update: {
      executeAt,
      status: "PENDING",
      attempts: 0,
      lastError: null,
    },
  });

  await prisma.post.update({
    where: { id: postId },
    data: { scheduledAt: executeAt, status: "SCHEDULED" },
  });

  return { jobId: job.id, executeAt, status: "PENDING" };
}

/**
 * Cancel a scheduled post.
 */
export async function cancelScheduledPost(postId: string): Promise<void> {
  await prisma.scheduledJob.updateMany({
    where: { postId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  await prisma.post.update({
    where: { id: postId },
    data: { scheduledAt: null, status: "DRAFT" },
  });
}

/**
 * Process all due scheduled posts. Should be called periodically (e.g., via cron or API route).
 */
export async function processScheduledPosts(): Promise<void> {
  const now = new Date();

  const dueJobs = await prisma.scheduledJob.findMany({
    where: {
      status: "PENDING",
      executeAt: { lte: now },
    },
    orderBy: { executeAt: "asc" },
    take: 10,
  });

  for (const job of dueJobs) {
    try {
      await publishPost(job.postId);

      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED" },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to publish post ${job.postId}:`, message);

      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: job.attempts >= 2 ? "FAILED" : "PENDING",
          attempts: { increment: 1 },
          lastError: message,
          // Retry in 5 minutes if not maxed out
          executeAt:
            job.attempts < 2
              ? new Date(now.getTime() + 5 * 60 * 1000)
              : undefined,
        },
      });

      if (job.attempts >= 2) {
        await prisma.post.update({
          where: { id: job.postId },
          data: { status: "FAILED" },
        });
      }
    }
  }
}

async function publishPost(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { include: { linkedinConnection: true } },
      images: { where: { approved: true, active: true }, take: 1 },
    },
  });

  if (!post) throw new Error(`Post ${postId} not found`);

  const connection = post.user.linkedinConnection;
  if (!connection || !connection.connected) {
    throw new Error("No active LinkedIn connection");
  }

  if (connection.expiresAt < new Date()) {
    throw new Error("LinkedIn access token expired");
  }

  const memberUrn = connection.memberUrn;
  if (!memberUrn) throw new Error("No LinkedIn member URN");

  // Create idempotency key
  const idempotencyKey = `pub_${postId}_${randomUUID()}`;

  await prisma.publishAttempt.create({
    data: {
      postId,
      idempotencyKey,
      status: "PENDING",
    },
  });

  let postUrn: string;

  const activeImage = post.images[0];
  if (activeImage) {
    // Upload image and create image post
    const imageBuffer = await fs.readFile(activeImage.filePath);
    const imageUrn = await uploadImage(
      connection.accessToken,
      memberUrn,
      imageBuffer
    );
    postUrn = await createImagePost(
      connection.accessToken,
      memberUrn,
      post.content,
      imageUrn
    );
  } else {
    postUrn = await createTextPost(
      connection.accessToken,
      memberUrn,
      post.content
    );
  }

  await prisma.publishAttempt.updateMany({
    where: { idempotencyKey },
    data: { status: "SUCCESS", linkedinPostId: postUrn },
  });

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      linkedinPostUrn: postUrn,
    },
  });
}
