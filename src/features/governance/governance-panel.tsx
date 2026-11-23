"use client";

import { useState } from "react";
import { UserCog, UserMinus, UserPlus, CalendarX, ShieldCheck, History, AlertCircle, X, Check, Clock } from "lucide-react";
import {
  grantPresidentDesignationAction,
  revokePresidentDesignationAction,
  markJuniorOfficerUnavailableAction,
  revokeJuniorOfficerUnavailableAction,
} from "@/features/governance/actions";
import {
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/features/projects/styles";

type GovernanceOverview = {
  canManagePresident: boolean;
  canRevokePresident: boolean;
  canManageAvailability: boolean;
  presidents: Array<{
    id: string;
    membership_id: string;
    designation: string;
    granted_by_user_id: string;
    grant_reason: string;
    granted_at: string;
    revoked_at: string | null;
    revoked_by_user_id: string | null;
    revocation_reason: string | null;
  }>;
  unavailable: Array<{
    id: string;
    membership_id: string;
    reason: string;
    marked_by_user_id: string;
    starts_at: string;
    ends_at: string | null;
    revoked_at: string | null;
    revoked_by_user_id: string | null;
    revocation_reason: string | null;
  }>;
  events: Array<{
    id: string;
    membership_id: string;
    actor_user_id: string;
    event_type: string;
    reason: string;
    created_at: string;
  }>;
};

export function GovernancePanel({
  organizationId,
  overview,
}: {
  organizationId: string;
  overview: GovernanceOverview;
}) {
  const [grantDialog, setGrantDialog] = useState<{ open: boolean; membershipId: string }>({ open: false, membershipId: "" });
  const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; membershipId: string; designationId: string }>({ open: false, membershipId: "", designationId: "" });
  const [unavailableDialog, setUnavailableDialog] = useState<{ open: boolean; membershipId: string }>({ open: false, membershipId: "" });
  const [revokeUnavailableDialog, setRevokeUnavailableDialog] = useState<{ open: boolean; membershipId: string; unavailabilityId: string }>({ open: false, membershipId: "", unavailabilityId: "" });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
      <div className="space-y-6">
        <section className="surface-panel" aria-labelledby="president-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Executive authorization</p>
              <h2 id="president-title" className="mt-2 text-xl font-semibold flex items-center gap-2">
                <ShieldCheck className="size-5" aria-hidden="true" />
                President designation
              </h2>
            </div>
            {overview.canManagePresident && (
              <button
                className={primaryButtonClassName}
                onClick={() => setGrantDialog({ open: true, membershipId: "" })}
              >
                <UserPlus className="size-4 mr-2" aria-hidden="true" />
                Grant President
              </button>
            )}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Only the website owner may grant the President designation to an active
            Executive. The designation enables the President workflow step as an
            alternative to unanimous Junior Officer approval.
          </p>

          {overview.presidents.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              No active President designation.
            </p>
          ) : (
            <ul className="mt-4 space-y-3" role="list">
              {overview.presidents.map((president) => (
                <li
                  key={president.id}
                  className="rounded-xl border border-white/8 bg-white/[0.025] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Membership: {president.membership_id.slice(0, 8)}…</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Granted {new Date(president.granted_at).toLocaleString()} · Reason: {president.grant_reason}
                      </p>
                    </div>
                    {overview.canRevokePresident && (
                      <button
                        className={secondaryButtonClassName}
                        onClick={() => setRevokeDialog({ open: true, membershipId: president.membership_id, designationId: president.id })}
                      >
                        <UserMinus className="size-3.5 mr-1.5" aria-hidden="true" />
                        Revoke
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {grantDialog.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="grant-dialog-title">
              <div className="surface-panel w-full max-w-md rounded-2xl p-6">
                <h3 id="grant-dialog-title" className="text-lg font-semibold flex items-center gap-2">
                  <UserPlus className="size-5" aria-hidden="true" />
                  Grant President designation
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  The recipient must be an active Executive. This action creates an
                  immutable audit event.
                </p>
                <form action={grantPresidentDesignationAction} className="mt-4 space-y-4">
                  <input name="organizationId" type="hidden" value={organizationId} />
                  <label className="block text-sm font-medium">
                    Membership ID
                    <input
                      className={fieldClassName}
                      name="membershipId"
                      required
                      inputMode="text"
                      defaultValue={grantDialog.membershipId}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Reason (required)
                    <textarea
                      className={fieldClassName}
                      name="reason"
                      required
                      rows={3}
                      maxLength={500}
                    />
                  </label>
                  <div className="flex justify-end gap-3">
                    <button type="button" className={secondaryButtonClassName} onClick={() => setGrantDialog({ open: false, membershipId: "" })}>
                      Cancel
                    </button>
                    <button className={primaryButtonClassName} type="submit">
                      Grant
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {revokeDialog.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="revoke-dialog-title">
              <div className="surface-panel w-full max-w-md rounded-2xl p-6">
                <h3 id="revoke-dialog-title" className="text-lg font-semibold flex items-center gap-2">
                  <UserMinus className="size-5" aria-hidden="true" />
                  Revoke President designation
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This action creates an immutable audit event and immediately removes
                  the President workflow step eligibility.
                </p>
                <form action={revokePresidentDesignationAction} className="mt-4 space-y-4">
                  <input name="organizationId" type="hidden" value={organizationId} />
                  <input name="membershipId" type="hidden" value={revokeDialog.membershipId} />
                  <label className="block text-sm font-medium">
                    Reason (required)
                    <textarea
                      className={fieldClassName}
                      name="reason"
                      required
                      rows={3}
                      maxLength={500}
                    />
                  </label>
                  <div className="flex justify-end gap-3">
                    <button type="button" className={secondaryButtonClassName} onClick={() => setRevokeDialog({ open: false, membershipId: "", designationId: "" })}>
                      Cancel
                    </button>
                    <button className={primaryButtonClassName} type="submit">
                      Revoke
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>

        <section className="surface-panel" aria-labelledby="availability-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Team availability</p>
              <h2 id="availability-title" className="mt-2 text-xl font-semibold flex items-center gap-2">
                <CalendarX className="size-5" aria-hidden="true" />
                Junior Officer unavailability
              </h2>
            </div>
            {overview.canManageAvailability && (
              <button
                className={primaryButtonClassName}
                onClick={() => setUnavailableDialog({ open: true, membershipId: "" })}
              >
                <UserCog className="size-4 mr-2" aria-hidden="true" />
                Mark unavailable
              </button>
            )}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            A Publicity Director or Pro may mark an active Junior Officer temporarily
            unavailable. The frozen workflow roster excludes that member from
            unanimity until the recorded period ends or is revoked. This triggers
            auto-reevaluation of any pending Junior Officer unanimous steps.
          </p>

          {overview.unavailable.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              No active unavailability periods.
            </p>
          ) : (
            <ul className="mt-4 space-y-3" role="list">
              {overview.unavailable.map((u) => (
                <li
                  key={u.id}
                  className="rounded-xl border border-white/8 bg-white/[0.025] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Membership: {u.membership_id.slice(0, 8)}…</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {new Date(u.starts_at).toLocaleString()}
                        {u.ends_at ? ` → ${new Date(u.ends_at).toLocaleString()}` : " (indefinite)"}
                        · Reason: {u.reason}
                      </p>
                    </div>
                    {overview.canManageAvailability && (
                      <button
                        className={secondaryButtonClassName}
                        onClick={() => setRevokeUnavailableDialog({ open: true, membershipId: u.membership_id, unavailabilityId: u.id })}
                      >
                        <X className="size-3.5 mr-1.5" aria-hidden="true" />
                        Revoke
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {unavailableDialog.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="unavailable-dialog-title">
              <div className="surface-panel w-full max-w-md rounded-2xl p-6">
                <h3 id="unavailable-dialog-title" className="text-lg font-semibold flex items-center gap-2">
                  <CalendarX className="size-5" aria-hidden="true" />
                  Mark Junior Officer unavailable
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  The member must be an active Junior Officer. This triggers immediate
                  auto-reevaluation of any pending unanimous steps.
                </p>
                <form action={markJuniorOfficerUnavailableAction} className="mt-4 space-y-4">
                  <input name="organizationId" type="hidden" value={organizationId} />
                  <label className="block text-sm font-medium">
                    Membership ID
                    <input
                      className={fieldClassName}
                      name="membershipId"
                      required
                      inputMode="text"
                      defaultValue={unavailableDialog.membershipId}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Reason (required)
                    <textarea
                      className={fieldClassName}
                      name="reason"
                      required
                      rows={3}
                      maxLength={500}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Ends at (optional, ISO timestamp)
                    <input
                      className={fieldClassName}
                      name="endsAt"
                      placeholder="2026-12-31T16:00:00.000Z"
                    />
                  </label>
                  <div className="flex justify-end gap-3">
                    <button type="button" className={secondaryButtonClassName} onClick={() => setUnavailableDialog({ open: false, membershipId: "" })}>
                      Cancel
                    </button>
                    <button className={primaryButtonClassName} type="submit">
                      Mark unavailable
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {revokeUnavailableDialog.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="revoke-unavailable-dialog-title">
              <div className="surface-panel w-full max-w-md rounded-2xl p-6">
                <h3 id="revoke-unavailable-dialog-title" className="text-lg font-semibold flex items-center gap-2">
                  <Check className="size-5" aria-hidden="true" />
                  Restore availability
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This immediately restores the Junior Officer&apos;s obligation in any
                  pending unanimous workflow steps.
                </p>
                <form action={revokeJuniorOfficerUnavailableAction} className="mt-4 space-y-4">
                  <input name="organizationId" type="hidden" value={organizationId} />
                  <input name="membershipId" type="hidden" value={revokeUnavailableDialog.membershipId} />
                  <label className="block text-sm font-medium">
                    Reason (required)
                    <textarea
                      className={fieldClassName}
                      name="reason"
                      required
                      rows={3}
                      maxLength={500}
                    />
                  </label>
                  <div className="flex justify-end gap-3">
                    <button type="button" className={secondaryButtonClassName} onClick={() => setRevokeUnavailableDialog({ open: false, membershipId: "", unavailabilityId: "" })}>
                      Cancel
                    </button>
                    <button className={primaryButtonClassName} type="submit">
                      Restore
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="surface-panel" aria-labelledby="audit-title">
          <p className="eyebrow">Immutable audit trail</p>
          <h2 id="audit-title" className="mt-2 text-xl font-semibold flex items-center gap-2">
            <History className="size-5" aria-hidden="true" />
            Governance events
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            All designation and availability changes are recorded here. Events cannot
            be modified or deleted.
          </p>
          {overview.events.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              No governance events recorded yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3" role="list">
              {overview.events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-xl border border-white/8 bg-white/[0.025] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {event.event_type === "president_granted" && <ShieldCheck className="size-4 text-[var(--lavender)]" aria-hidden="true" />}
                      {event.event_type === "president_revoked" && <UserMinus className="size-4 text-[var(--attention)]" aria-hidden="true" />}
                      {event.event_type === "unavailable_marked" && <CalendarX className="size-4 text-amber-400" aria-hidden="true" />}
                      {event.event_type === "unavailable_revoked" && <Check className="size-4 text-[var(--success)]" aria-hidden="true" />}
                      <span className="font-medium capitalize">
                        {event.event_type.replaceAll("_", " ")}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Membership: {event.membership_id.slice(0, 8)}… · Actor: {event.actor_user_id.slice(0, 8)}…
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{event.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}