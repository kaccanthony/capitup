import type { Metadata } from "next";
import { ProtectedWorkspace } from "@/features/auth/protected-workspace";

export const metadata: Metadata = {
  title: "Archive",
};

export default function ArchivePage() {
  return <ProtectedWorkspace view="archive" />;
}
