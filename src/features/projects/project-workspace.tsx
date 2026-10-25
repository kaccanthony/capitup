import type { ReactNode } from "react";
import Link from "next/link";
import {
  Archive,
  CalendarDays,
  FileText,
  FolderKanban,
  House,
} from "lucide-react";
import { BrandMark } from "@/components/capitup/brand-mark";
import { LogoutButton } from "@/features/auth/logout-button";

const navigation = [
  { href: "/", label: "Overview", icon: House },
  { href: "/captions", label: "Captions", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/archive", label: "Archive", icon: Archive },
];

export function ProjectWorkspace({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app-background min-h-dvh">
      <a className="skip-link" href="#main-content">
        Skip to projects
      </a>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid min-h-dvh max-w-[1500px] grid-cols-1 md:grid-cols-[5.5rem_1fr]">
        <nav
          className="hidden border-r border-white/8 bg-black/15 px-3 py-6 md:flex md:flex-col"
          aria-label="Primary navigation"
        >
          <div className="mb-8 flex justify-center">
            <BrandMark compact />
          </div>
          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className={`nav-item group ${item.href === "/projects" ? "nav-item-active" : ""}`}
                  href={item.href}
                  aria-current={item.href === "/projects" ? "page" : undefined}
                  key={item.href}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 px-4 pb-24 pt-5 sm:px-7 md:px-10 md:pb-10">
          <header className="border-b border-white/8 pb-7">
            <div className="mb-7 flex items-center justify-between md:hidden">
              <BrandMark />
              <LogoutButton />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="eyebrow">{eyebrow}</p>
                <h1 className="dashboard-title mt-2">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  {description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="hidden md:inline-flex">
                  <LogoutButton />
                </span>
                {actions}
              </div>
            </div>
          </header>

          <main id="main-content" className="py-7">
            {children}
          </main>
        </div>
      </div>

      <nav className="mobile-navigation" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className={`mobile-nav-item ${item.href === "/projects" ? "mobile-nav-item-active" : ""}`}
              href={item.href}
              aria-current={item.href === "/projects" ? "page" : undefined}
              key={item.href}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export {
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/features/projects/styles";
