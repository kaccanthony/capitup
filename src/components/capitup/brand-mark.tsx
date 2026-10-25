import { Sparkles } from "lucide-react";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3" aria-label="CapItUp">
      <span
        aria-hidden="true"
        className="brand-mark grid size-11 shrink-0 place-items-center rounded-2xl"
      >
        <Sparkles className="size-5" strokeWidth={1.8} />
      </span>
      {!compact && (
        <span className="text-base font-semibold tracking-[-0.02em]">
          CapItUp
        </span>
      )}
    </div>
  );
}
