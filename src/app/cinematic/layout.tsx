import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Step Through. Work Smarter.",
  description: "A voyage through forgotten realms, where past and future intertwine.",
};

export default function CinematicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
