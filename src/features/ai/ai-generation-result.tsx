"use client";

import type { AiGenerationOutput } from "@/features/ai/contracts";

type AiGenerationResultProps = {
  output: AiGenerationOutput;
  styleProfileName: string | null;
  influencingExampleIds: string[];
  onInsertDraft: (body: string) => void;
  onInsertSuggestion: (body: string) => void;
};

/**
 * This component exposes only human-controlled insertion callbacks. It has no
 * submit, approval, publish, or direct persistence capability.
 */
export function AiGenerationResult({
  output,
  styleProfileName,
  influencingExampleIds,
  onInsertDraft,
  onInsertSuggestion,
}: AiGenerationResultProps) {
  return (
    <section className="surface-panel" aria-labelledby="ai-results-title">
      <p className="eyebrow">AI-generated editable options</p>
      <h2 id="ai-results-title" className="mt-2 text-xl font-semibold">
        Review before using
      </h2>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Profile: {styleProfileName ?? "No style profile"} · Examples:{" "}
        {influencingExampleIds.length}
      </p>
      <div className="mt-5 space-y-4">
        {output.variants.map((variant, index) => {
          const caption = [
            variant.hook,
            variant.body,
            variant.cta,
            ...variant.hashtags,
          ]
            .filter(Boolean)
            .join("\n\n");
          return (
            <article
              className="rounded-xl border border-white/8 bg-white/[0.025] p-4"
              key={`${variant.hook}-${index}`}
            >
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Direction {index + 1} · {variant.tone}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                {caption}
              </p>
              {variant.assumptions.length > 0 && (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Assumptions: {variant.assumptions.join("; ")}
                </p>
              )}
              {variant.warnings.length > 0 && (
                <p className="mt-2 text-sm text-amber-200">
                  Warnings: {variant.warnings.join("; ")}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm"
                  type="button"
                  onClick={() => onInsertDraft(caption)}
                >
                  Insert as editable draft
                </button>
                <button
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm"
                  type="button"
                  onClick={() => onInsertSuggestion(caption)}
                >
                  Insert as suggestion
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
