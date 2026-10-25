import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Archive,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileText,
  FolderKanban,
  House,
  LayoutList,
  MessageSquareText,
  PenLine,
  Search,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { BrandMark } from "@/components/capitup/brand-mark";
import { Button } from "@/components/ui/button";

type NavigationItem = {
  view: WorkspaceView;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type WorkspaceView =
  "overview" | "captions" | "projects" | "calendar" | "archive";

type CaptionStatus = "Needs refinement" | "In review" | "Draft";

type CaptionFixture = {
  title: string;
  project: string;
  meta: string;
  due: string;
  status: CaptionStatus;
};

const navigation: NavigationItem[] = [
  { view: "overview", label: "Overview", href: "/", icon: House },
  { view: "captions", label: "Captions", href: "/captions", icon: FileText },
  {
    view: "projects",
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    view: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  { view: "archive", label: "Archive", href: "/archive", icon: Archive },
];

const viewContent: Record<
  WorkspaceView,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: "Wednesday · October 22",
    title: "Good morning, team.",
    description:
      "Three captions need attention. Start with the closest deadline, then keep the review queue moving.",
  },
  captions: {
    eyebrow: "Caption workspace",
    title: "Captions",
    description:
      "A dedicated preview of the writing queue, with the sample items kept separate from the dashboard overview.",
  },
  projects: {
    eyebrow: "Project workspace",
    title: "Projects",
    description:
      "A focused project view for the fixture work already represented in this Phase 01 shell.",
  },
  calendar: {
    eyebrow: "Scheduling workspace",
    title: "Calendar",
    description:
      "A route-level schedule preview that keeps planning context out of the dashboard overview.",
  },
  archive: {
    eyebrow: "Archive workspace",
    title: "Archive",
    description:
      "A separate archive view reserved for searchable historical captions in a later implementation phase.",
  },
};

const captions: CaptionFixture[] = [
  {
    title: "Innovation Week launch",
    project: "Innovation Week 2026",
    meta: "Post · Event",
    due: "Due today · 4:00 PM",
    status: "Needs refinement",
  },
  {
    title: "Student spotlight: October",
    project: "Community Stories",
    meta: "Article · Story",
    due: "Due tomorrow",
    status: "In review",
  },
  {
    title: "Volunteer call teaser",
    project: "Campus Outreach",
    meta: "Video · Reel",
    due: "Due Friday",
    status: "Draft",
  },
];

const weekItems = [
  {
    day: "22",
    label: "Innovation Week caption",
    time: "4:00 PM",
    urgent: true,
  },
  { day: "23", label: "Student spotlight review", time: "10:00 AM" },
  { day: "25", label: "Outreach reel draft", time: "6:00 PM" },
];

const activityItems = [
  {
    initials: "MC",
    name: "Mika Cruz",
    action: "requested refinement",
    item: "Innovation Week launch",
    time: "12 min ago",
  },
  {
    initials: "JR",
    name: "Jules Reyes",
    action: "submitted version 3",
    item: "Student spotlight: October",
    time: "48 min ago",
  },
  {
    initials: "TA",
    name: "Taylor Aquino",
    action: "left a comment",
    item: "Volunteer call teaser",
    time: "2 hr ago",
  },
];

const statusStyles: Record<CaptionStatus, string> = {
  "Needs refinement": "status-attention",
  "In review": "status-review",
  Draft: "status-draft",
};

function NavigationLink({
  item,
  active = false,
}: {
  item: NavigationItem;
  active?: boolean;
}) {
  const Icon = item.icon;
  const classes = `nav-item group ${active ? "nav-item-active" : ""}`;

  if (!item.href) {
    return (
      <span className={classes} aria-disabled="true">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
        <span className="nav-label">{item.label}</span>
        <span className="nav-tooltip" role="tooltip">
          {item.label} · later phase
        </span>
      </span>
    );
  }

  return (
    <Link
      className={classes}
      href={item.href}
      aria-current={active ? "page" : undefined}
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
      <span className="nav-label">{item.label}</span>
      <span className="nav-tooltip" role="tooltip">
        {item.label}
      </span>
    </Link>
  );
}

function PrimaryNavigation({ view }: { view: WorkspaceView }) {
  return (
    <nav className="nav-rail" aria-label="Primary navigation">
      <div className="flex justify-center py-1">
        <BrandMark compact />
      </div>

      <div className="flex flex-col items-center gap-2">
        {navigation.map((item) => (
          <NavigationLink
            item={item}
            active={item.view === view}
            key={item.label}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2">
        <span className="nav-item nav-item-disabled" aria-disabled="true">
          <Bell aria-hidden="true" className="size-5" strokeWidth={1.7} />
          <span className="nav-label">Alerts</span>
          <span className="nav-tooltip" role="tooltip">
            Notifications
          </span>
        </span>
        <span className="nav-item nav-item-disabled" aria-disabled="true">
          <CircleUserRound
            aria-hidden="true"
            className="size-5"
            strokeWidth={1.7}
          />
          <span className="nav-label">Profile</span>
        </span>
      </div>
    </nav>
  );
}

function MobileNavigation({ view }: { view: WorkspaceView }) {
  return (
    <nav className="mobile-navigation" aria-label="Mobile navigation">
      {navigation.slice(0, 4).map((item) => {
        const Icon = item.icon;
        return (
          <Link
            className={
              item.view === view
                ? "mobile-nav-item mobile-nav-item-active"
                : "mobile-nav-item"
            }
            href={item.href}
            aria-current={item.view === view ? "page" : undefined}
            key={item.label}
          >
            <Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function StatusBadge({ status }: { status: CaptionStatus }) {
  return (
    <span className={`status-badge ${statusStyles[status]}`}>
      <span aria-hidden="true" className="status-dot" />
      {status}
    </span>
  );
}

function CaptionCard({ caption }: { caption: CaptionFixture }) {
  return (
    <article className="work-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-muted)]">
            {caption.meta}
          </p>
          <h3 className="mt-1.5 text-[0.98rem] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
            {caption.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {caption.project}
          </p>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={`Open ${caption.title}`}
          disabled
        >
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={caption.status} />
        <span
          className={
            caption.status === "Needs refinement"
              ? "due-copy due-copy-urgent"
              : "due-copy"
          }
        >
          <Clock3 aria-hidden="true" className="size-3.5" />
          {caption.due}
        </span>
      </div>
    </article>
  );
}

function DashboardHeader({
  view,
  sessionControls,
}: {
  view: WorkspaceView;
  sessionControls?: ReactNode;
}) {
  const content = viewContent[view];

  return (
    <header className="dashboard-header">
      <div className="mobile-brand">
        <BrandMark />
        <button
          className="icon-button"
          type="button"
          aria-label="Open notifications"
          disabled
        >
          <Bell aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1 id="dashboard-title" className="dashboard-title">
            {content.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            {content.description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {sessionControls}
          <button
            className="icon-button hidden sm:grid"
            type="button"
            aria-label="Search workspace"
            disabled
          >
            <Search aria-hidden="true" className="size-4" />
          </button>
          <Button disabled aria-describedby="phase-note" size="lg">
            <PenLine aria-hidden="true" data-icon="inline-start" />
            New caption
          </Button>
        </div>
      </div>
      <p id="phase-note" className="sr-only">
        Caption creation becomes available in a later implementation phase.
      </p>
    </header>
  );
}

function AttentionPanel() {
  return (
    <section className="attention-panel" aria-labelledby="attention-title">
      <div className="attention-glow" aria-hidden="true" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow text-[var(--lavender-soft)]">
              Needs your attention
            </p>
            <h2
              id="attention-title"
              className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.035em] sm:text-3xl"
            >
              One caption is waiting on your refinement.
            </h2>
          </div>
          <span className="attention-count" aria-label="One urgent item">
            01
          </span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-lg font-semibold">Innovation Week launch</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Mika requested changes · Version 2 · Due today at 4:00 PM
            </p>
          </div>
          <Button variant="secondary" disabled>
            Review draft
            <ChevronRight aria-hidden="true" data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function CaptionsSection() {
  return (
    <section id="captions" aria-labelledby="captions-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Personal queue</p>
          <h2 id="captions-title">My captions</h2>
        </div>
        <span className="section-count">3 active</span>
      </div>
      <div className="grid gap-3">
        {captions.map((caption) => (
          <CaptionCard caption={caption} key={caption.title} />
        ))}
      </div>
    </section>
  );
}

function WeekSection() {
  return (
    <section
      id="calendar"
      className="surface-panel h-fit"
      aria-labelledby="week-title"
    >
      <div className="section-heading section-heading-compact">
        <div>
          <p className="eyebrow">Schedule</p>
          <h2 id="week-title">This week</h2>
        </div>
        <CalendarDays
          aria-hidden="true"
          className="size-5 text-[var(--lavender)]"
        />
      </div>

      <ol className="mt-2 space-y-1">
        {weekItems.map((item) => (
          <li className="timeline-row" key={item.day + item.label}>
            <span
              className={
                item.urgent
                  ? "timeline-date timeline-date-urgent"
                  : "timeline-date"
              }
            >
              <span className="text-[10px] uppercase tracking-[0.12em]">
                Oct
              </span>
              <strong>{item.day}</strong>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[var(--text-primary)]">
                {item.label}
              </span>
              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                {item.time}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-5 border-t border-white/8 pt-4 text-xs leading-5 text-[var(--text-muted)]">
        Preview schedule · no calendar service connected
      </p>
    </section>
  );
}

function ProjectSummary() {
  return (
    <section
      id="projects"
      className="surface-panel"
      aria-labelledby="project-title"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-10 place-items-center rounded-2xl bg-[var(--lavender)]/12 text-[var(--lavender-soft)]">
          <UsersRound aria-hidden="true" className="size-5" />
        </span>
        <span className="section-count">Sample</span>
      </div>
      <p className="eyebrow mt-6">Active project</p>
      <h2
        id="project-title"
        className="mt-2 text-xl font-semibold tracking-[-0.025em]"
      >
        Innovation Week 2026
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        4 caption items · 2 awaiting review
      </p>
      <div
        className="mt-5 flex -space-x-2"
        aria-label="Four assigned team members"
      >
        {["MC", "JR", "TA", "+1"].map((initials, index) => (
          <span
            className={`avatar-chip avatar-${index + 1}`}
            aria-hidden="true"
            key={initials}
          >
            {initials}
          </span>
        ))}
      </div>
    </section>
  );
}

function RecentActivity() {
  return (
    <section
      id="activity"
      className="surface-panel"
      aria-labelledby="activity-title"
    >
      <div className="section-heading section-heading-compact">
        <div>
          <p className="eyebrow">Workspace movement</p>
          <h2 id="activity-title">Recently updated</h2>
        </div>
        <MessageSquareText
          aria-hidden="true"
          className="size-5 text-[var(--lavender)]"
        />
      </div>

      <ol className="mt-1 divide-y divide-white/7">
        {activityItems.map((item, index) => (
          <li className="activity-row" key={item.name + item.time}>
            <span
              className={`avatar-chip avatar-${index + 1}`}
              aria-hidden="true"
            >
              {item.initials}
            </span>
            <p className="min-w-0 text-sm leading-5 text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">
                {item.name}
              </span>{" "}
              {item.action}{" "}
              <span className="text-[var(--lavender-soft)]">{item.item}</span>
            </p>
            <time className="shrink-0 text-xs text-[var(--text-muted)]">
              {item.time}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RoutePreview({ view }: { view: Exclude<WorkspaceView, "overview"> }) {
  const content = viewContent[view];

  if (view === "captions") {
    return (
      <>
        <section
          className="view-intro surface-panel"
          aria-labelledby="view-intro-title"
        >
          <p className="eyebrow">{content.eyebrow}</p>
          <h2
            id="view-intro-title"
            className="mt-2 text-xl font-semibold tracking-[-0.025em]"
          >
            Draft queue preview
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Static sample items only. Editing, assignments, and workflow actions
            remain unavailable in Phase 01.
          </p>
        </section>
        <div className="mt-6">
          <CaptionsSection />
        </div>
      </>
    );
  }

  if (view === "projects") {
    return (
      <div className="route-grid">
        <ProjectSummary />
        <section
          className="surface-panel"
          aria-labelledby="project-preview-title"
        >
          <p className="eyebrow">{content.eyebrow}</p>
          <h2
            id="project-preview-title"
            className="mt-2 text-xl font-semibold tracking-[-0.025em]"
          >
            Project overview preview
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Project membership and status are illustrative fixtures, not
            connected workspace data.
          </p>
        </section>
      </div>
    );
  }

  if (view === "calendar") {
    return (
      <div className="route-grid">
        <WeekSection />
        <section
          className="surface-panel"
          aria-labelledby="calendar-preview-title"
        >
          <p className="eyebrow">{content.eyebrow}</p>
          <h2
            id="calendar-preview-title"
            className="mt-2 text-xl font-semibold tracking-[-0.025em]"
          >
            Schedule preview
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Dates are static fixtures. Calendar synchronization and deadline
            updates are not connected.
          </p>
        </section>
      </div>
    );
  }

  return (
    <section className="surface-panel" aria-labelledby="archive-preview-title">
      <p className="eyebrow">{content.eyebrow}</p>
      <h2
        id="archive-preview-title"
        className="mt-2 text-xl font-semibold tracking-[-0.025em]"
      >
        Archive preview
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
        Historical captions, search, filters, and retention data will be
        implemented only when the archive phase begins.
      </p>
      <div
        className="archive-placeholder"
        aria-label="Archive controls unavailable in Phase 01"
      >
        <Search aria-hidden="true" className="size-4" />
        <span>Search archive is unavailable in this fixture.</span>
      </div>
    </section>
  );
}

function AssistantRail() {
  return (
    <aside className="assistant-rail" aria-labelledby="assistant-title">
      <div className="assistant-orb" aria-hidden="true">
        <Sparkles className="size-7" strokeWidth={1.45} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Writing support</p>
            <h2
              id="assistant-title"
              className="mt-2 text-xl font-semibold tracking-[-0.025em]"
            >
              Draft assistant
            </h2>
          </div>
          <span className="draft-badge">Draft only</span>
        </div>

        <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">
          Shape a starting point while the team keeps authorship, review, and
          approval in human hands.
        </p>

        <div className="assistant-context">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Current context
          </p>
          <div className="mt-3 flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-[var(--lavender-soft)]">
              <FileText aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Innovation Week launch</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Post · Event · Version 2
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Try asking
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Three opening hooks", "Clarify the CTA", "Shorter version"].map(
              (prompt) => (
                <button
                  className="prompt-chip"
                  type="button"
                  disabled
                  key={prompt}
                >
                  {prompt}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="assistant-composer">
          <label className="sr-only" htmlFor="assistant-prompt">
            Ask the draft assistant
          </label>
          <textarea
            id="assistant-prompt"
            rows={3}
            placeholder="Ask for a hook, rewrite, or platform variation…"
            disabled
            aria-describedby="assistant-phase-note"
          />
          <button
            className="assistant-send"
            type="button"
            disabled
            aria-label="Send prompt"
          >
            <Send aria-hidden="true" className="size-4" />
          </button>
        </div>

        <p
          id="assistant-phase-note"
          className="mt-3 text-xs leading-5 text-[var(--text-muted)]"
        >
          Interface preview only. No private caption is sent to an AI provider
          in Phase 01.
        </p>

        <div className="assistant-guardrail">
          <Check
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[var(--success)]"
          />
          <p>
            Generated text will remain editable and can never approve or publish
            a caption.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function DashboardShell({
  view = "overview",
  sessionControls,
}: {
  view?: WorkspaceView;
  sessionControls?: ReactNode;
}) {
  return (
    <div className="app-background">
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="app-frame">
        <PrimaryNavigation view={view} />

        <div className="workspace-column">
          <DashboardHeader view={view} sessionControls={sessionControls} />
          <main
            id="main-content"
            aria-labelledby="dashboard-title"
            className="dashboard-main"
          >
            <section aria-label={`${viewContent[view].title} preview`}>
              <div className="mb-5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <LayoutList aria-hidden="true" className="size-3.5" />
                <span>Preview workspace · sample data</span>
              </div>
              {view === "overview" ? (
                <AttentionPanel />
              ) : (
                <RoutePreview view={view} />
              )}
            </section>

            {view === "overview" && (
              <>
                <div className="dashboard-grid">
                  <CaptionsSection />
                  <div className="grid content-start gap-5">
                    <WeekSection />
                    <ProjectSummary />
                  </div>
                </div>

                <RecentActivity />
              </>
            )}
          </main>
        </div>

        <AssistantRail />
      </div>
      <MobileNavigation view={view} />
    </div>
  );
}
