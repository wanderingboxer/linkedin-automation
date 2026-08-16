import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createTextPost,
  createImagePost,
  uploadImage,
} from "@/lib/linkedin/publisher";
import { readFile } from "fs/promises";

async function getUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user as { id: string };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const post = await prisma.post.findFirst({
      where: { id, userId: user.id },
      include: { images: { where: { active: true, approved: true }, take: 1 } },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "READY_TO_PUBLISH" && post.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: `Cannot publish post in ${post.status} status` },
        { status: 400 }
      );
    }

    // Verify text hash matches current content
    const currentTextHash = createHash("sha256")
      .update(post.content)
      .digest("hex");

    if (post.approvedTextHash !== currentTextHash) {
      return NextResponse.json(
        { error: "Post content has changed since approval. Please re-approve text." },
        { status: 409 }
      );
    }

    // Verify image hash matches current approved image
    const approvedImage = post.images[0];
    if (approvedImage) {
      const currentImageHash = createHash("sha256")
        .update(approvedImage.filePath)
        .digest("hex");

      if (post.approvedImageHash !== currentImageHash) {
        return NextResponse.json(
          { error: "Image has changed since approval. Please re-approve image." },
          { status: 409 }
        );
      }
    }

    // Get LinkedIn connection
    const linkedinConnection = await prisma.linkedInConnection.findUnique({
      where: { userId: user.id },
    });

    if (!linkedinConnection || !linkedinConnection.connected) {
      return NextResponse.json(
        { error: "LinkedIn not connected. Please connect your account first." },
        { status: 400 }
      );
    }

    if (linkedinConnection.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "LinkedIn access token expired. Please reconnect." },
        { status: 401 }
      );
    }

    // Create idempotency key
    const idempotencyKey = uuidv4();

    // Check for existing successful publish attempt
    const existingAttempt = await prisma.publishAttempt.findFirst({
      where: { postId: id, status: "SUCCESS" },
    });

    if (existingAttempt) {
      return NextResponse.json(
        { error: "Post already published", linkedinPostId: existingAttempt.linkedinPostId },
        { status: 409 }
      );
    }

    // Create publish attempt record
    const attempt = await prisma.publishAttempt.create({
      data: {
        postId: id,
        idempotencyKey,
        status: "PENDING",
      },
    });

    try {
      let postUrn: string;

      if (approvedImage) {
        // Read image file and upload to LinkedIn
        const imageBuffer = await readFile(approvedImage.filePath);
        const imageUrn = await uploadImage(
          linkedinConnection.accessToken,
          linkedinConnection.memberUrn!,
          imageBuffer
        );
        postUrn = await createImagePost(
          linkedinConnection.accessToken,
          linkedinConnection.memberUrn!,
          post.content,
          imageUrn
        );
      } else {
        postUrn = await createTextPost(
          linkedinConnection.accessToken,
          linkedinConnection.memberUrn!,
          post.content
        );
      }

      // Update attempt and post
      await prisma.publishAttempt.update({
        where: { id: attempt.id },
        data: { status: "SUCCESS", linkedinPostId: postUrn },
      });

      const updated = await prisma.post.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          linkedinPostUrn: postUrn,
        },
      });

      // Cancel any scheduled job
      await prisma.scheduledJob.deleteMany({ where: { postId: id } });

      return NextResponse.json({
        post: updated,
        linkedinPostUrn: postUrn,
      });
    } catch (publishError) {
      await prisma.publishAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "FAILED",
          errorMessage:
            publishError instanceof Error
              ? publishError.message
              : "Unknown publishing error",
        },
      });

      return NextResponse.json(
        { error: "Failed to publish to LinkedIn" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Publish post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
