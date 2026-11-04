"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Vercel Web Analytics and Speed Insights. Visits inside the sales page's live hotel previews
// (iframes) are not counted, so each hotel's numbers are real guests only.
const notInPreview = <T,>(event: T): T | null => (typeof window !== "undefined" && window.self !== window.top ? null : event);

export function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={notInPreview} />
      <SpeedInsights beforeSend={notInPreview} />
    </>
  );
}
