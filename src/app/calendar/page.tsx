import type { Metadata } from "next";
import { ProtectedWorkspace } from "@/features/auth/protected-workspace";

export const metadata: Metadata = {
  title: "Calendar",
};

export default function CalendarPage() {
  return <ProtectedWorkspace view="calendar" />;
}
