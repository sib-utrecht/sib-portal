import ActivityPage from "./activity-page-client";

export function generateStaticParams() {
  // output: export requires at least one entry per dynamic route.
  // The app is fully client-rendered via Convex, so real IDs are unknown at
  // build time. The CI copies index.html → 404.html so the client-side router
  // handles all real /activities/<id> navigation; this placeholder merely
  // satisfies Next.js's static-export requirement.
  return [{ id: "_" }];
}

export default function Page() {
  return <ActivityPage />;
}
