import type { Metadata } from "next";
import { ProtectedWorkspace } from "@/features/auth/protected-workspace";

export const metadata: Metadata = {
  title: "Captions",
};

export default function CaptionsPage() {
  return <ProtectedWorkspace view="captions" />;
}
