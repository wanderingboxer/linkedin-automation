import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter }) as unknown as PrismaClient;
}

const DEFAULT_PILLARS = [
  {
    name: "Supply Chain & Logistics",
    description:
      "Global supply chain trends, logistics innovation, freight technology, and trade dynamics.",
    keywords: [
      "supply chain",
      "logistics",
      "freight",
      "shipping",
      "trade",
      "warehouse",
      "last mile",
      "3PL",
    ],
  },
  {
    name: "AI & Machine Learning",
    description:
      "Artificial intelligence applications in business, ML models, automation, and AI strategy.",
    keywords: [
      "artificial intelligence",
      "machine learning",
      "deep learning",
      "LLM",
      "GPT",
      "generative AI",
      "automation",
      "neural network",
    ],
  },
  {
    name: "SaaS & Product",
    description:
      "Software-as-a-service business models, product management, PLG, and B2B SaaS growth.",
    keywords: [
      "SaaS",
      "product-led growth",
      "B2B",
      "subscription",
      "product management",
      "PLG",
      "churn",
      "ARR",
    ],
  },
  {
    name: "Startup & Entrepreneurship",
    description:
      "Startup culture, fundraising, scaling, founder lessons, and the venture ecosystem.",
    keywords: [
      "startup",
      "founder",
      "venture capital",
      "fundraising",
      "seed round",
      "scaling",
      "bootstrapping",
      "YC",
    ],
  },
  {
    name: "Leadership & Management",
    description:
      "Leadership frameworks, team building, management practices, and organizational design.",
    keywords: [
      "leadership",
      "management",
      "team building",
      "culture",
      "hiring",
      "org design",
      "coaching",
      "mentorship",
    ],
  },
  {
    name: "Data & Analytics",
    description:
      "Data-driven decision making, analytics tools, data engineering, and business intelligence.",
    keywords: [
      "data analytics",
      "business intelligence",
      "data engineering",
      "dashboards",
      "metrics",
      "KPI",
      "data warehouse",
      "ETL",
    ],
  },
  {
    name: "Climate & Sustainability",
    description:
      "Sustainability in business, ESG, carbon emissions, green logistics, and climate tech.",
    keywords: [
      "sustainability",
      "ESG",
      "carbon footprint",
      "green logistics",
      "climate tech",
      "net zero",
      "decarbonization",
    ],
  },
  {
    name: "Fintech & Payments",
    description:
      "Financial technology, payments infrastructure, cross-border payments, and embedded finance.",
    keywords: [
      "fintech",
      "payments",
      "cross-border",
      "embedded finance",
      "neobank",
      "BNPL",
      "blockchain",
      "digital payments",
    ],
  },
  {
    name: "India Tech Ecosystem",
    description:
      "Indian startup ecosystem, Digital India, UPI, tech policy, and emerging market dynamics.",
    keywords: [
      "India tech",
      "UPI",
      "Digital India",
      "Indian startup",
      "Bengaluru",
      "ONDC",
      "India market",
    ],
  },
  {
    name: "Global Trade & Geopolitics",
    description:
      "International trade policies, tariffs, geopolitical shifts affecting business and supply chains.",
    keywords: [
      "global trade",
      "tariffs",
      "geopolitics",
      "sanctions",
      "trade war",
      "WTO",
      "import export",
      "trade policy",
    ],
  },
  {
    name: "Cloud & Infrastructure",
    description:
      "Cloud computing, DevOps, infrastructure modernization, and platform engineering.",
    keywords: [
      "cloud computing",
      "AWS",
      "Azure",
      "GCP",
      "DevOps",
      "Kubernetes",
      "serverless",
      "infrastructure",
    ],
  },
  {
    name: "Career & Professional Growth",
    description:
      "Career development, skill building, job market trends, and professional networking.",
    keywords: [
      "career growth",
      "skill development",
      "job market",
      "networking",
      "resume",
      "interview",
      "upskilling",
      "career change",
    ],
  },
  {
    name: "E-commerce & D2C",
    description:
      "E-commerce trends, direct-to-consumer brands, marketplace dynamics, and retail tech.",
    keywords: [
      "ecommerce",
      "D2C",
      "marketplace",
      "retail tech",
      "Shopify",
      "Amazon",
      "quick commerce",
      "omnichannel",
    ],
  },
  {
    name: "Productivity & Tools",
    description:
      "Productivity frameworks, tools, workflows, and personal effectiveness strategies.",
    keywords: [
      "productivity",
      "tools",
      "workflow",
      "no-code",
      "low-code",
      "automation",
      "Notion",
      "time management",
    ],
  },
  {
    name: "Marketing & Growth",
    description:
      "Growth marketing, content strategy, SEO, demand generation, and brand building.",
    keywords: [
      "growth marketing",
      "SEO",
      "content marketing",
      "demand generation",
      "brand",
      "ABM",
      "social media",
      "go-to-market",
    ],
  },
  {
    name: "Emerging Tech",
    description:
      "Cutting-edge technology trends including AR/VR, quantum computing, robotics, and Web3.",
    keywords: [
      "emerging tech",
      "AR",
      "VR",
      "quantum computing",
      "robotics",
      "Web3",
      "IoT",
      "edge computing",
    ],
  },
];

export async function main() {
  const prisma = createPrismaClient();

  try {
    console.log("Seeding database...");

    // Create or find default user
    const passwordHash = await bcrypt.hash("password123", 12);

    let user = await prisma.user.findUnique({
      where: { email: "admin@example.com" },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "admin@example.com",
          name: "Aditya Saxena",
          passwordHash,
        },
      });
      console.log("Created default user: admin@example.com");
    } else {
      console.log("Default user already exists, skipping creation.");
    }

    // Create or update user profile
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    if (!existingProfile) {
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          name: "Aditya Saxena",
          headline:
            "Building the future of logistics tech | Co-founder & CTO at GoComet",
          bio: "Technology leader passionate about using AI and data to transform global supply chains. I write about the intersection of logistics, SaaS, and emerging technology.",
          currentRole: "Co-founder & CTO at GoComet",
          previousRoles: JSON.stringify([
            "Senior Software Engineer at Flipkart",
            "Software Engineer at Morgan Stanley",
          ]),
          skills: JSON.stringify([
            "Full-Stack Development",
            "System Design",
            "Machine Learning",
            "Supply Chain Technology",
            "Product Strategy",
            "Team Leadership",
          ]),
          industries: JSON.stringify([
            "Supply Chain & Logistics",
            "SaaS",
            "Artificial Intelligence",
            "E-commerce",
          ]),
          topicsOfInterest: JSON.stringify([
            "AI in logistics",
            "Global trade",
            "SaaS growth",
            "Startup leadership",
            "India tech ecosystem",
          ]),
          topicsToAvoid: JSON.stringify([
            "Crypto speculation",
            "Political controversies",
          ]),
          contentGoals:
            "Establish thought leadership in logistics tech and AI. Share practical insights for founders and tech leaders. Build a personal brand that attracts talent and partnerships.",
          writingStyle: "insightful",
          targetAudience:
            "Tech founders, CTOs, supply chain professionals, and SaaS leaders interested in the intersection of technology and logistics.",
          linkedinProfileUrl:
            "https://www.linkedin.com/in/aditya-saxena-gocomet/",
          postingFrequency: "daily",
          preferredPostTimes: JSON.stringify([
            "08:00",
            "12:00",
            "18:00",
          ]),
          geoRelevance: "India, Global",
          preferredLanguages: JSON.stringify(["en"]),
          contentPillars: JSON.stringify([
            "Supply Chain & Logistics",
            "AI & Machine Learning",
            "SaaS & Product",
            "Startup & Entrepreneurship",
          ]),
        },
      });
      console.log("Created user profile for Aditya Saxena.");
    } else {
      console.log("User profile already exists, skipping creation.");
    }

    // Create default content pillars
    const existingPillars = await prisma.contentPillar.count({
      where: { userId: user.id },
    });

    if (existingPillars === 0) {
      await prisma.contentPillar.createMany({
        data: DEFAULT_PILLARS.map((pillar, index) => ({
          userId: user!.id,
          name: pillar.name,
          description: pillar.description,
          keywords: JSON.stringify(pillar.keywords),
          priority: index < 4 ? 1 : 0,
          enabled: true,
          sortOrder: index,
        })),
      });
      console.log(`Created ${DEFAULT_PILLARS.length} default content pillars.`);
    } else {
      console.log(
        `${existingPillars} content pillars already exist, skipping creation.`
      );
    }

    console.log("Seeding complete.");
  } finally {
    await prisma.$disconnect();
  }
}
