"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  useOthers,
  useRoom,
  useStatus,
} from "@liveblocks/react";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as Y from "yjs";
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import { Check, CircleAlert, MessageSquareText, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createCollaborationSuggestionAction,
  createCollaborationThreadAction,
  decideCollaborationSuggestionAction,
  markCollaborationSuggestionAppliedAction,
  replyCollaborationThreadAction,
  resolveCollaborationThreadAction,
  setCaptionReactionAction,
} from "@/features/collaboration/actions";
import type {
  CollaborationSuggestionDto,
  CollaborationWorkspaceDto,
} from "@/features/collaboration/data";
import { collaborationFieldName } from "@/features/collaboration/room";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { CollaborationAccessMode, Json } from "@/types/database";
import {
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/features/projects/styles";

type Anchor = {
  from: number;
  to: number;
  quote: string;
  fromRelative?: string;
  toRelative?: string;
};

type ProsemirrorMapping = Parameters<
  typeof absolutePositionToRelativePosition
>[2];

type YSyncState = {
  type: Y.XmlFragment;
  binding: {
    mapping: ProsemirrorMapping;
  };
};

function encodeBytes(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return window.btoa(binary);
}

function decodeBytes(value: string) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parseAnchor(value: Json): Anchor | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const from = value.from;
  const to = value.to;
  const quote = value.quote;
  const fromRelative = value.fromRelative;
  const toRelative = value.toRelative;
  if (
    typeof from !== "number" ||
    typeof to !== "number" ||
    typeof quote !== "string" ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < from
  ) {
    return null;
  }
  return {
    from,
    to,
    quote,
    fromRelative: typeof fromRelative === "string" ? fromRelative : undefined,
    toRelative: typeof toRelative === "string" ? toRelative : undefined,
  };
}

function currentYSyncState(editor: NonNullable<ReturnType<typeof useEditor>>) {
  return ySyncPluginKey.getState(editor.state) as YSyncState | undefined;
}

function withRelativePositions(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  value: Anchor,
): Anchor {
  const sync = currentYSyncState(editor);
  if (!sync) return value;

  return {
    ...value,
    fromRelative: encodeBytes(
      Y.encodeRelativePosition(
        absolutePositionToRelativePosition(
          value.from,
          sync.type,
          sync.binding.mapping,
        ),
      ),
    ),
    toRelative: encodeBytes(
      Y.encodeRelativePosition(
        absolutePositionToRelativePosition(
          value.to,
          sync.type,
          sync.binding.mapping,
        ),
      ),
    ),
  };
}

function resolveAnchor(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  value: Anchor,
): Anchor {
  const sync = currentYSyncState(editor);
  if (!sync || !value.fromRelative || !value.toRelative) return value;

  try {
    const from = relativePositionToAbsolutePosition(
      sync.type.doc!,
      sync.type,
      Y.decodeRelativePosition(decodeBytes(value.fromRelative)),
      sync.binding.mapping,
    );
    const to = relativePositionToAbsolutePosition(
      sync.type.doc!,
      sync.type,
      Y.decodeRelativePosition(decodeBytes(value.toRelative)),
      sync.binding.mapping,
    );
    if (from === null || to === null || to < from) return value;
    return { ...value, from, to };
  } catch {
    return value;
  }
}

function MentionSelect({
  options,
  name,
}: {
  options: CollaborationWorkspaceDto["mentionOptions"];
  name: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <label className="block text-xs font-medium text-[var(--text-secondary)]">
      Mention members{" "}
      <span className="text-[var(--text-muted)]">(optional)</span>
      <select
        className={fieldClassName}
        multiple
        value={selected}
        onChange={(event) =>
          setSelected(
            Array.from(
              event.currentTarget.selectedOptions,
              (option) => option.value,
            ),
          )
        }
      >
        {options.map((option) => (
          <option value={option.userId} key={option.userId}>
            {option.label}
          </option>
        ))}
      </select>
      <input type="hidden" name={name} value={JSON.stringify(selected)} />
    </label>
  );
}

function AccessLeaseGuard({
  projectId,
  contentItemId,
  accessMode,
  onAccessMode,
}: {
  projectId: string;
  contentItemId: string;
  accessMode: CollaborationAccessMode;
  onAccessMode: (mode: CollaborationAccessMode) => void;
}) {
  const room = useRoom();
  const status = useStatus();
  const router = useRouter();
  const previousStatus = useRef(status);

  const revalidate = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/liveblocks-auth/${projectId}/${contentItemId}/access`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        room.disconnect();
        router.refresh();
        return;
      }

      const result = (await response.json()) as {
        accessMode: CollaborationAccessMode;
        revoked: boolean;
      };
      if (result.revoked) {
        room.disconnect();
        router.refresh();
        return;
      }

      if (result.accessMode !== accessMode) {
        onAccessMode(result.accessMode);
        room.disconnect();
        window.location.reload();
      }
    } catch {
      room.disconnect();
    }
  }, [accessMode, contentItemId, onAccessMode, projectId, room, router]);

  useEffect(() => {
    const interval = window.setInterval(() => void revalidate(), 60_000);
    const onOnline = () => void revalidate();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("capitup:access-revalidate", onOnline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("capitup:access-revalidate", onOnline);
    };
  }, [revalidate]);

  useEffect(() => {
    if (status === "connected" && previousStatus.current !== "connected") {
      void revalidate();
    }
    previousStatus.current = status;
  }, [revalidate, status]);

  return null;
}

function CollaborationEditor({
  projectId,
  contentItemId,
  workspace,
}: {
  projectId: string;
  contentItemId: string;
  workspace: CollaborationWorkspaceDto;
}) {
  const router = useRouter();
  const room = useRoom();
  const status = useStatus();
  const others = useOthers();
  const [accessMode, setAccessMode] = useState(workspace.accessMode);
  const [anchor, setAnchor] = useState<Anchor>({ from: 1, to: 1, quote: "" });
  const [replacement, setReplacement] = useState("");
  const [snapshotState, setSnapshotState] = useState<
    "idle" | "submitting" | "error"
  >("idle");
  const [snapshotError, setSnapshotError] = useState("");
  const liveblocks = useLiveblocksExtension({
    field: collaborationFieldName,
    initialContent: workspace.initialContent,
    comments: false,
    mentions: false,
    offlineSupport_experimental: false,
  });
  const editor = useEditor({
    immediatelyRender: false,
    editable: accessMode === "write",
    extensions: [StarterKit.configure({ undoRedo: false }), liveblocks],
    editorProps: {
      attributes: {
        class:
          "min-h-72 rounded-xl border border-white/10 bg-black/15 px-4 py-4 text-sm leading-7 outline-none focus:border-[var(--lavender)]",
        "aria-label": "Collaborative caption editor",
      },
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to } = currentEditor.state.selection;
      setAnchor(
        withRelativePositions(currentEditor, {
          from,
          to,
          quote: currentEditor.state.doc.textBetween(from, to, " "),
        }),
      );
    },
  });

  useEffect(() => {
    editor?.setEditable(accessMode === "write");
  }, [accessMode, editor]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const refresh = () => router.refresh();
    const channel = supabase
      .channel(`collaboration:${contentItemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaboration_threads",
          filter: `content_item_id=eq.${contentItemId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "caption_reactions",
          filter: `content_item_id=eq.${contentItemId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_instances",
          filter: `content_item_id=eq.${contentItemId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_instance_steps",
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaboration_comments",
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaboration_suggestions",
          filter: `content_item_id=eq.${contentItemId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaboration_sessions",
          filter: `content_item_id=eq.${contentItemId}`,
        },
        () => window.dispatchEvent(new Event("capitup:access-revalidate")),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [contentItemId, projectId, router]);

  const suggestionKind = useMemo(() => {
    if (anchor.quote && replacement) return "replace";
    if (anchor.quote) return "delete";
    return "insert";
  }, [anchor.quote, replacement]);

  const applyAcceptedSuggestion = useCallback(
    async (suggestion: CollaborationSuggestionDto) => {
      if (!editor || accessMode !== "write") return;
      const parsedAnchor = parseAnchor(suggestion.anchor);
      const storedAnchor = parsedAnchor
        ? resolveAnchor(editor, parsedAnchor)
        : null;
      if (!storedAnchor) return;
      const current = editor.state.doc.textBetween(
        storedAnchor.from,
        storedAnchor.to,
        " ",
      );
      if (current !== suggestion.sourceText) return;

      const changed = editor
        .chain()
        .focus()
        .insertContentAt(
          { from: storedAnchor.from, to: storedAnchor.to },
          suggestion.replacementText,
        )
        .run();
      if (!changed) return;

      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("contentItemId", contentItemId);
      formData.set("suggestionId", suggestion.id);
      formData.set("expectedVersion", String(suggestion.recordVersion));
      await markCollaborationSuggestionAppliedAction(formData);
    },
    [accessMode, contentItemId, editor, projectId],
  );

  const submitSnapshot = useCallback(
    async (formData: FormData) => {
      const templateId = formData.get("templateId");
      if (typeof templateId !== "string") return;
      setSnapshotState("submitting");
      setSnapshotError("");
      try {
        const response = await fetch(
          `/api/collaboration-snapshot/${projectId}/${contentItemId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateId }),
          },
        );
        if (!response.ok) throw new Error("Snapshot submission failed.");
        room.disconnect();
        window.location.reload();
      } catch {
        setSnapshotState("error");
        setSnapshotError(
          "The exact collaborative snapshot could not be submitted. Try again after the connection recovers.",
        );
      }
    },
    [contentItemId, projectId, room],
  );

  return (
    <div className="space-y-5">
      <AccessLeaseGuard
        projectId={projectId}
        contentItemId={contentItemId}
        accessMode={accessMode}
        onAccessMode={setAccessMode}
      />

      <section className="surface-panel" aria-labelledby="collaboration-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Liveblocks room</p>
            <h2 id="collaboration-title" className="mt-2 text-xl font-semibold">
              Collaborative caption
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="status-badge status-review">
              {status.replaceAll("_", " ")}
            </span>
            <span className="status-badge status-draft">
              <Users aria-hidden="true" className="size-3.5" />
              {others.length + 1} present
            </span>
            <span className="status-badge status-draft">
              {accessMode === "write" ? "Editing" : "Read only"}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
          Live edits and presence use Liveblocks. Durable review records and the
          submitted version stay in Supabase. Offline editing is disabled.
        </p>
        <div className="mt-5">
          <EditorContent editor={editor} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-panel" aria-labelledby="comments-title">
          <h2
            id="comments-title"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <MessageSquareText aria-hidden="true" className="size-5" />
            Comments
          </h2>
          {workspace.canComment && (
            <form
              action={createCollaborationThreadAction}
              className="mt-4 space-y-3"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="contentItemId" value={contentItemId} />
              <input
                type="hidden"
                name="anchor"
                value={JSON.stringify(anchor)}
              />
              <label className="block text-sm font-medium">
                Comment on{" "}
                {anchor.quote ? `“${anchor.quote.slice(0, 80)}”` : "the cursor"}
                <textarea
                  className={fieldClassName}
                  name="body"
                  required
                  maxLength={5000}
                  rows={3}
                />
              </label>
              <MentionSelect
                options={workspace.mentionOptions}
                name="mentionedUserIds"
              />
              <button className={secondaryButtonClassName} type="submit">
                Add anchored comment
              </button>
            </form>
          )}

          <div className="mt-5 space-y-4">
            {workspace.threads.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">
                No durable comments yet.
              </p>
            )}
            {workspace.threads.map((thread) => {
              const threadAnchor = parseAnchor(thread.anchor);
              return (
                <article
                  className="rounded-xl border border-white/8 bg-black/10 p-3"
                  key={thread.id}
                >
                  <p className="text-xs text-[var(--text-muted)]">
                    {threadAnchor?.quote
                      ? `On “${threadAnchor.quote.slice(0, 90)}”`
                      : "Document anchor"}
                    {thread.resolvedAt ? " · Resolved" : " · Open"}
                  </p>
                  {editor && threadAnchor && (
                    <button
                      className="mt-2 text-xs font-semibold text-[var(--lavender-soft)]"
                      type="button"
                      onClick={() => {
                        const resolved = resolveAnchor(editor, threadAnchor);
                        editor
                          .chain()
                          .focus()
                          .setTextSelection({
                            from: resolved.from,
                            to: resolved.to,
                          })
                          .run();
                      }}
                    >
                      Go to anchor
                    </button>
                  )}
                  <div className="mt-3 space-y-3">
                    {thread.comments.map((comment) => (
                      <div key={comment.id}>
                        <p className="text-xs font-semibold">
                          {comment.authorName}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                          {comment.body}
                        </p>
                      </div>
                    ))}
                  </div>
                  {workspace.canComment && (
                    <form
                      action={replyCollaborationThreadAction}
                      className="mt-3 space-y-2"
                    >
                      <input type="hidden" name="projectId" value={projectId} />
                      <input
                        type="hidden"
                        name="contentItemId"
                        value={contentItemId}
                      />
                      <input type="hidden" name="threadId" value={thread.id} />
                      <textarea
                        className={fieldClassName}
                        name="body"
                        required
                        maxLength={5000}
                        rows={2}
                        aria-label="Reply"
                      />
                      <MentionSelect
                        options={workspace.mentionOptions}
                        name="mentionedUserIds"
                      />
                      <button
                        className={secondaryButtonClassName}
                        type="submit"
                      >
                        Reply
                      </button>
                    </form>
                  )}
                  {(workspace.canReview ||
                    thread.createdByUserId === workspace.currentUserId) && (
                    <form
                      action={resolveCollaborationThreadAction}
                      className="mt-3"
                    >
                      <input type="hidden" name="projectId" value={projectId} />
                      <input
                        type="hidden"
                        name="contentItemId"
                        value={contentItemId}
                      />
                      <input type="hidden" name="threadId" value={thread.id} />
                      <input
                        type="hidden"
                        name="resolved"
                        value={thread.resolvedAt ? "false" : "true"}
                      />
                      <button
                        className={secondaryButtonClassName}
                        type="submit"
                      >
                        {thread.resolvedAt ? "Reopen" : "Resolve"}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="surface-panel" aria-labelledby="suggestions-title">
          <h2 id="suggestions-title" className="text-lg font-semibold">
            Suggestions
          </h2>
          {workspace.canSuggest && (
            <form
              action={createCollaborationSuggestionAction}
              className="mt-4 space-y-3"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="contentItemId" value={contentItemId} />
              <input type="hidden" name="kind" value={suggestionKind} />
              <input
                type="hidden"
                name="anchor"
                value={JSON.stringify(anchor)}
              />
              <input type="hidden" name="sourceText" value={anchor.quote} />
              <label className="block text-sm font-medium">
                Proposed replacement
                <textarea
                  className={fieldClassName}
                  value={replacement}
                  onChange={(event) =>
                    setReplacement(event.currentTarget.value)
                  }
                  name="replacementText"
                  maxLength={10000}
                  rows={3}
                  placeholder={
                    anchor.quote
                      ? "Leave empty to suggest deletion"
                      : "Enter text to insert"
                  }
                />
              </label>
              <p className="text-xs text-[var(--text-muted)]">
                {anchor.quote
                  ? `Selected: “${anchor.quote.slice(0, 100)}”`
                  : "No text selected; this will be an insertion."}
              </p>
              <button
                className={secondaryButtonClassName}
                type="submit"
                disabled={!anchor.quote && !replacement}
              >
                Create {suggestionKind} suggestion
              </button>
            </form>
          )}

          <div className="mt-5 space-y-3">
            {workspace.suggestions.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">
                No durable suggestions yet.
              </p>
            )}
            {workspace.suggestions.map((suggestion) => (
              <article
                className="rounded-xl border border-white/8 bg-black/10 p-3"
                key={suggestion.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold">
                    {suggestion.authorName}
                  </p>
                  <span className="status-badge status-draft">
                    {suggestion.state}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {suggestion.kind}: “{suggestion.sourceText || "∅"}” → “
                  {suggestion.replacementText || "∅"}”
                </p>
                {workspace.canReview && suggestion.state === "open" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["accept", "reject"] as const).map((action) => (
                      <form
                        action={decideCollaborationSuggestionAction}
                        key={action}
                      >
                        <input
                          type="hidden"
                          name="projectId"
                          value={projectId}
                        />
                        <input
                          type="hidden"
                          name="contentItemId"
                          value={contentItemId}
                        />
                        <input
                          type="hidden"
                          name="suggestionId"
                          value={suggestion.id}
                        />
                        <input
                          type="hidden"
                          name="expectedVersion"
                          value={suggestion.recordVersion}
                        />
                        <input type="hidden" name="action" value={action} />
                        <button
                          className={secondaryButtonClassName}
                          type="submit"
                        >
                          {action === "accept" ? "Accept" : "Reject"}
                        </button>
                      </form>
                    ))}
                  </div>
                )}
                {suggestion.state === "accepted" &&
                  !suggestion.appliedAt &&
                  accessMode === "write" && (
                    <button
                      className={`${secondaryButtonClassName} mt-3`}
                      type="button"
                      onClick={() => void applyAcceptedSuggestion(suggestion)}
                    >
                      Apply to live draft
                    </button>
                  )}
                {suggestion.appliedAt && (
                  <p className="mt-3 flex items-center gap-1 text-xs text-[var(--success)]">
                    <Check aria-hidden="true" className="size-3.5" /> Applied
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          className="surface-panel"
          aria-labelledby="review-status-title"
        >
          <h2 id="review-status-title" className="text-lg font-semibold">
            Live review status
          </h2>
          {!workspace.latestReview ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              No immutable version has been submitted yet.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-white/8 bg-black/10 p-3">
                <p className="text-sm font-semibold">
                  Version {workspace.latestReview.versionNumber}
                </p>
                <p className="mt-1 text-xs capitalize text-[var(--text-muted)]">
                  {workspace.latestReview.status.replaceAll("_", " ")}
                  {workspace.latestReview.currentStep
                    ? ` · ${workspace.latestReview.currentStep}`
                    : ""}
                </p>
              </div>

              <div className="rounded-xl border border-white/8 bg-black/10 p-3">
                <p className="text-sm font-semibold">Submission evidence</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {workspace.latestReview.evidence.wordCount ?? "Legacy"} words
                  {" · "}
                  {workspace.latestReview.evidence.graphemeCount ??
                    "Legacy"}{" "}
                  graphemes
                </p>
                {workspace.latestReview.evidence.wordPolicyConfigured ===
                  false && (
                  <p className="mt-2 text-xs text-[var(--attention)]">
                    No active word policy was configured for every selected tag
                    when this version was submitted.
                  </p>
                )}
                {(workspace.latestReview.evidence.wordPolicies.length > 0 ||
                  workspace.latestReview.evidence.destinations.length > 0) && (
                  <ul className="mt-3 space-y-2 text-xs">
                    {workspace.latestReview.evidence.wordPolicies.map(
                      (policy) => (
                        <li
                          className="rounded-lg border border-white/8 px-2.5 py-2"
                          key={policy.policyId}
                        >
                          <span className="font-semibold">
                            Word policy {policy.policyVersion}
                          </span>{" "}
                          <span className="text-[var(--text-muted)]">
                            · {policy.warningState.replaceAll("_", " ")} ·
                            recommendation {policy.recommendedWordLimit} · hard
                            maximum {policy.globalHardMaximumWords}
                          </span>
                          {policy.recommendationExempt && (
                            <p className="mt-1 text-[var(--attention)]">
                              Special-case exemption: {policy.exemptionReason}
                            </p>
                          )}
                        </li>
                      ),
                    )}
                    {workspace.latestReview.evidence.destinations.map(
                      (destination) => (
                        <li
                          className="rounded-lg border border-white/8 px-2.5 py-2"
                          key={destination.publicationChannelId}
                        >
                          <span className="font-semibold">
                            {destination.label}
                          </span>{" "}
                          <span className="text-[var(--text-muted)]">
                            · {destination.warningState.replaceAll("_", " ")} ·{" "}
                            {destination.graphemeCount} characters
                            {destination.characterLimit === null
                              ? " · policy unconfigured"
                              : ` / ${destination.characterLimit} · ${destination.policyVersion}`}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold">Advisory reactions</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  Reactions are non-binding and never advance formal approval.
                </p>
                {workspace.latestReview.reactions.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    No reactions on this version.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {workspace.latestReview.reactions.map((reaction) => (
                      <li
                        className="rounded-xl border border-white/8 px-3 py-2 text-sm"
                        key={reaction.id}
                      >
                        <span className="font-semibold">
                          {reaction.actorName}
                        </span>{" "}
                        <span className="capitalize text-[var(--text-secondary)]">
                          · {reaction.kind.replaceAll("_", " ")}
                        </span>
                        {reaction.comment && (
                          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                            {reaction.comment}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {workspace.canReact && (
                <div className="space-y-3 border-t border-white/8 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <form action={setCaptionReactionAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input
                        type="hidden"
                        name="contentItemId"
                        value={contentItemId}
                      />
                      <input
                        type="hidden"
                        name="captionVersionId"
                        value={workspace.latestReview.captionVersionId}
                      />
                      <input type="hidden" name="kind" value="looks_ready" />
                      <button
                        className={secondaryButtonClassName}
                        type="submit"
                      >
                        Looks ready
                      </button>
                    </form>
                    <form action={setCaptionReactionAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input
                        type="hidden"
                        name="contentItemId"
                        value={contentItemId}
                      />
                      <input
                        type="hidden"
                        name="captionVersionId"
                        value={workspace.latestReview.captionVersionId}
                      />
                      <input type="hidden" name="kind" value="" />
                      <button
                        className={secondaryButtonClassName}
                        type="submit"
                      >
                        Clear mine
                      </button>
                    </form>
                  </div>
                  <form action={setCaptionReactionAction} className="space-y-2">
                    <input type="hidden" name="projectId" value={projectId} />
                    <input
                      type="hidden"
                      name="contentItemId"
                      value={contentItemId}
                    />
                    <input
                      type="hidden"
                      name="captionVersionId"
                      value={workspace.latestReview.captionVersionId}
                    />
                    <input type="hidden" name="kind" value="needs_refinement" />
                    <label className="block text-sm font-medium">
                      Needs refinement comment
                      <textarea
                        className={fieldClassName}
                        name="comment"
                        required
                        maxLength={1000}
                        rows={2}
                      />
                    </label>
                    <button className={secondaryButtonClassName} type="submit">
                      Needs refinement
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {accessMode === "write" && (
        <section className="surface-panel" aria-labelledby="snapshot-title">
          <h2 id="snapshot-title" className="text-lg font-semibold">
            Submit exact version
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            CapItUp freezes the current Liveblocks Yjs state, stores its hash
            and provider version reference, then starts review against that
            immutable Supabase version.
          </p>
          {workspace.workflowTemplates.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-[var(--attention)]">
              <CircleAlert aria-hidden="true" className="size-4" /> No active
              workflow template is available.
            </p>
          ) : (
            <form
              action={submitSnapshot}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <label className="min-w-64 flex-1 text-sm font-medium">
                Review workflow
                <select className={fieldClassName} name="templateId" required>
                  {workspace.workflowTemplates.map((template) => (
                    <option value={template.id} key={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={primaryButtonClassName}
                type="submit"
                disabled={
                  snapshotState === "submitting" || status !== "connected"
                }
              >
                {snapshotState === "submitting"
                  ? "Freezing snapshot…"
                  : "Submit for review"}
              </button>
            </form>
          )}
          {snapshotState === "error" && (
            <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
              {snapshotError}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export function CollaborationWorkspace({
  projectId,
  contentItemId,
  workspace,
}: {
  projectId: string;
  contentItemId: string;
  workspace: CollaborationWorkspaceDto;
}) {
  return (
    <LiveblocksProvider
      authEndpoint={`/api/liveblocks-auth/${projectId}/${contentItemId}`}
      throttle={100}
    >
      <RoomProvider id={workspace.roomId}>
        <CollaborationEditor
          projectId={projectId}
          contentItemId={contentItemId}
          workspace={workspace}
        />
      </RoomProvider>
    </LiveblocksProvider>
  );
}
