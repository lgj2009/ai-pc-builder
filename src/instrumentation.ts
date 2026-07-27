export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = (await import("node-cron")).default;

    cron.schedule("*/14 * * * *", async () => {
      try {
        const port = process.env.PORT || 3000;
        const res = await fetch(`http://localhost:${port}/api/ping`);
        if (res.ok) {
          console.log(
            `[keep-alive] ${new Date().toISOString()} — OK`
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error(`[keep-alive] failed: ${msg}`);
      }
    });

    console.log("[keep-alive] Registered — pinging every 14 minutes");
  }
}
