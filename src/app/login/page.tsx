import type { Metadata } from "next";
import { LoginShell } from "@/features/auth/login-shell";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Authorized access to the private CapItUp publicity workspace",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginShell nextPath={next} />;
}
