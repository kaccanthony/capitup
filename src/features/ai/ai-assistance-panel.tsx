type AiAssistancePanelProps = {
  canEdit: boolean;
  styleProfileName?: string | null;
  influencingExampleCount?: number;
  profiles?: readonly { id: string; name: string; scope: string }[];
};

export function AiAssistancePanel({
  canEdit,
  styleProfileName = null,
  influencingExampleCount = 0,
  profiles = [],
}: AiAssistancePanelProps) {
  return (
    <section className="surface-panel" aria-labelledby="ai-assistance-title">
      <p className="eyebrow">Human-controlled assistance</p>
      <h2 id="ai-assistance-title" className="mt-2 text-xl font-semibold">
        AI assistance
      </h2>
      <p
        className="mt-3 text-sm leading-6 text-[var(--text-secondary)]"
        role="alert"
      >
        Gemini Free is currently limited to synthetic development tests. This
        caption, its style profiles, and its samples will not be sent to Gemini.
      </p>
      <dl className="mt-4 grid gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--text-muted)]">Style profile</dt>
          <dd className="text-right">
            {styleProfileName ?? "No profile selected"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--text-muted)]">Influencing examples</dt>
          <dd>{influencingExampleCount}</dd>
        </div>
      </dl>
      <label className="mt-4 block text-sm font-medium">
        Style profile
        <select
          className="mt-2 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled
          defaultValue={profiles[0]?.id ?? ""}
        >
          <option value="">No style profile</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} ({profile.scope})
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-sm font-medium">
        Requested action
        <select
          className="mt-2 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled
          defaultValue="generate_three_directions"
        >
          <option value="generate_three_directions">
            Generate three directions
          </option>
          <option value="adjust_length">Adjust length</option>
          <option value="naturalize">Make wording more natural</option>
          <option value="match_style">Match selected style</option>
        </select>
      </label>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        {canEdit
          ? "Manual drafting remains available while private-caption assistance is unavailable."
          : "Only an authorized writer can request assistance when a privacy-approved provider is enabled."}
      </p>
      <button
        className={`${secondaryButtonClassName} mt-5`}
        type="button"
        disabled
        aria-describedby="ai-assistance-unavailable"
      >
        Generate editable draft (unavailable)
      </button>
      <p id="ai-assistance-unavailable" className="sr-only">
        AI assistance is unavailable for private captions while Gemini Free is
        in synthetic-development-only mode.
      </p>
    </section>
  );
}

const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/90 disabled:cursor-not-allowed disabled:opacity-50";
