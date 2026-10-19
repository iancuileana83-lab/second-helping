import type { ReactNode } from "react";
import { ProfileProvider } from "@/components/profile-context";
import { SiteNav } from "@/components/site-nav";
import { ReplayTourButton, Tour } from "@/components/tour";
import { SIMULATED_BANNER, getTasteProvider } from "@/taste";
import "./globals.css";

export const metadata = {
  title: "SafePlate",
  description:
    "Taste-grounded meal ideas for older adults, checked by a transparent safety layer. Fictional data. Not medical advice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const simulated = getTasteProvider().simulated;
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <ProfileProvider>
          <SiteNav />
          <Tour />
          {simulated && (
            <p role="status" className="banner">
              <span aria-hidden="true">⚠️</span> {SIMULATED_BANNER}. The places and taste scores are made up until the real Qloo connection is added.
            </p>
          )}
          <main id="main">{children}</main>
          <footer className="footer">
            <p>
              <strong>Not medical advice. Fictional people and data only.</strong> Dishes are typical for a cuisine, so
              always check the menu. Ask your pharmacist or doctor about real medicines.
            </p>
            <p><ReplayTourButton /></p>
          </footer>
        </ProfileProvider>
      </body>
    </html>
  );
}
