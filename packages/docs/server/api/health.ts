export default defineEventHandler((event) => {
  setHeader(event, "Cache-Control", "no-store, no-cache, must-revalidate");

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION || "local",
    service: "burl-docs",
  };
});
