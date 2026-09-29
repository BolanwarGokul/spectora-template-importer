import { seedWorkspace } from "../src/lib/seed";
seedWorkspace(process.env.SEED_WORKSPACE || "development")
  .then(() =>
    console.log(
      "Seed completed. Browser workspaces are seeded automatically on first visit.",
    ),
  )
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
