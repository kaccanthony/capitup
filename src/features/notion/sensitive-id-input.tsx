"use client";

import { useState } from "react";

export function SensitiveIdInput({
  className,
  defaultValue,
  label,
  name,
  required = false,
}: {
  className: string;
  defaultValue: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="mt-1 flex gap-2">
      <input
        autoComplete="off"
        className={className}
        defaultValue={defaultValue}
        name={name}
        required={required}
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={`${visible ? "Hide" : "Show"} ${label}`}
        aria-pressed={visible}
        className="rounded-lg border border-white/15 px-3 text-sm"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </span>
  );
}
