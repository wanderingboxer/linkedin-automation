import { main } from "../src/lib/seed";

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
