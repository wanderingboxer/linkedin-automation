import { NextResponse } from "next/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

const DEFAULT_PILLARS = [
  "AI",
  "AI Agents",
  "Gen AI",
  "AI Products",
  "Product Management",
  "SaaS",
  "GTM Technology",
  "Sales Automation",
  "Business Automation",
  "Startups",
  "Emerging Technology",
  "Developer Tools",
  "LLMs",
  "AI Infrastructure",
  "AI + Business",
  "Future of Work",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        passwordHash,
        profile: {
          create: {
            name: name ?? "",
          },
        },
        contentPillars: {
          create: DEFAULT_PILLARS.map((pillarName, index) => ({
            name: pillarName,
            sortOrder: index,
            enabled: true,
          })),
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
