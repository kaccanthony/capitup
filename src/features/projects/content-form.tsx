"use client";

import { useState } from "react";
import type {
  ContentKind,
  ControlledTagSlug,
  TaxonomyOption,
} from "@/features/content/taxonomy";
import {
  fieldClassName,
  primaryButtonClassName,
} from "@/features/projects/styles";

export function ContentForm({
  action,
  projectId,
  taxonomy,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  projectId: string;
  taxonomy: TaxonomyOption[];
  initial?: {
    id: string;
    title: string;
    kind: ContentKind;
    tags: ControlledTagSlug[];
    isSpecialCase: boolean;
    specialCaseReason: string | null;
    recordVersion: number;
  };
  submitLabel: string;
}) {
  const [kind, setKind] = useState<ContentKind>(initial?.kind ?? "post");
  const [isSpecialCase, setIsSpecialCase] = useState(
    initial?.isSpecialCase ?? false,
  );
  const selectedTaxonomy = taxonomy.find((option) => option.kind === kind);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="projectId" value={projectId} />
      {initial && (
        <>
          <input type="hidden" name="contentItemId" value={initial.id} />
          <input
            type="hidden"
            name="expectedVersion"
            value={initial.recordVersion}
          />
        </>
      )}

      <label className="block text-sm font-medium">
        Title
        <input
          className={fieldClassName}
          name="title"
          defaultValue={initial?.title}
          required
          maxLength={200}
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Content kind</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {taxonomy.map((option) => (
            <label className="cursor-pointer" key={option.kind}>
              <input
                className="peer sr-only"
                type="radio"
                name="kind"
                value={option.kind}
                checked={kind === option.kind}
                onChange={() => setKind(option.kind)}
              />
              <span className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--text-secondary)] peer-checked:border-[var(--lavender)] peer-checked:bg-[var(--lavender)]/15 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--lavender-soft)]">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Controlled tags</legend>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Only tags approved for {kind} records are available.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {selectedTaxonomy?.tags.map((tag) => (
            <label
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2.5 text-sm"
              key={`${kind}-${tag.slug}`}
            >
              <input
                className="size-4 accent-[var(--lavender)]"
                type="checkbox"
                name="tags"
                value={tag.slug}
                defaultChecked={
                  initial?.kind === kind && initial.tags.includes(tag.slug)
                }
              />
              <span aria-hidden="true">{tag.emoji}</span>
              <span>{tag.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
        <label className="flex items-start gap-3 text-sm font-medium">
          <input
            className="mt-0.5 size-4 accent-[var(--lavender)]"
            type="checkbox"
            name="isSpecialCase"
            checked={isSpecialCase}
            onChange={(event) => setIsSpecialCase(event.target.checked)}
          />
          <span>
            Mark as a special case
            <span className="mt-1 block text-xs font-normal leading-5 text-[var(--text-muted)]">
              This records context only. It does not approve a length exception.
            </span>
          </span>
        </label>
        {isSpecialCase && (
          <label className="mt-4 block text-sm font-medium">
            Special-case reason
            <textarea
              className={fieldClassName}
              name="specialCaseReason"
              defaultValue={initial?.specialCaseReason ?? ""}
              required
              maxLength={500}
              rows={3}
            />
          </label>
        )}
      </div>

      <button className={primaryButtonClassName} type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
