import staticHosting from "@convex-dev/static-hosting/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

// Static Hosting owns the site root. Any future application HTTP routes will
// be served under /api so they cannot conflict with the SPA catch-all.
const app = defineApp({
  httpPrefix: "/api",
  env: {
    COGNITO_DOMAIN: v.string(),
    COGNITO_CLIENT_ID: v.string(),
  },
});
app.use(staticHosting, { httpPrefix: "/" });

export default app;
