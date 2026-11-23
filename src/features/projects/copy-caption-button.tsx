"use client";

import { useState } from "react";

export function CopyCaptionButton({ caption }: { caption: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="secondary-button" onClick={copyCaption} type="button">
      {copied ? "Copied" : "Copy Caption"}
    </button>
  );
}
