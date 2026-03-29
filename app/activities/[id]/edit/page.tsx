import EditActivityPage from "./edit-page-client";

export function generateStaticParams() {
  // See comment in app/activities/[id]/page.tsx for why a placeholder is used.
  return [{ id: "_" }];
}

export default function Page() {
  return <EditActivityPage />;
}
