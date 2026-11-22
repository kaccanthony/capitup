import Image from "next/image";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3" aria-label="CapItUp">
      <span
        aria-hidden="true"
        className="brand-mark grid size-11 shrink-0 place-items-center overflow-hidden rounded-full"
      >
        <Image
          src="/brand/capitup.png"
          alt=""
          width={44}
          height={44}
          className="size-full object-cover"
        />
      </span>
      {!compact && (
        <span className="font-heading text-base font-semibold tracking-[-0.02em]">
          CapItUp
        </span>
      )}
    </div>
  );
}
