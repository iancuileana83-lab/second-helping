import type { ReactNode } from "react";
import { ProfileProvider } from "@/components/profile-context";
import { SiteNav } from "@/components/site-nav";
import { ReplayTourButton, Tour } from "@/components/tour";
import { SIMULATED_BANNER, qlooConfigured } from "@/taste";
import "./globals.css";

export const metadata = {
  title: "Second Helping",
  description:
    "Second Helping: more of the food they love, checked against their medicines. Taste-based meal and restaurant ideas for older adults. The people are fictional. Not medical advice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const connected = qlooConfigured();
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <ProfileProvider>
          <SiteNav />
          <Tour />
          {connected ? (
            <p role="status" className="qloo-badge">
              <span aria-hidden="true">✨</span> Taste ranking by <strong>Qloo</strong>. Restaurants are real businesses; people are fictional.
            </p>
          ) : (
            <p role="status" className="banner">
              <span aria-hidden="true">⚠️</span> {SIMULATED_BANNER}. The places and taste scores are made up until the real Qloo connection is added.
            </p>
          )}
          <main id="main">{children}</main>
          <footer className="footer">
            <p>
              <strong>Not medical advice. The people in this demo are fictional.</strong>{" "}
              {connected
                ? "Restaurants come from Qloo and are real businesses. Second Helping is not affiliated with these restaurants; dishes are typical for the cuisine, not their menu, so always check with the restaurant. "
                : "Places are made up while Qloo is not connected, and dishes are typical for a cuisine, so always check the menu. "}
              Ask your pharmacist or doctor about real medicines.
            </p>
            <p><ReplayTourButton /></p>
          </footer>
        </ProfileProvider>
      </body>
    </html>
  );
}
