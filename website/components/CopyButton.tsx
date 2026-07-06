'use client';

import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={copied ? 'copy-btn copied' : 'copy-btn'}
      aria-label="Copy to clipboard"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard can be unavailable (permissions, http) — the text is
          // selectable right there, so failing quietly is fine.
        }
      }}
    >
      {copied ? 'copied' : 'copy'}
    </button>
  );
}
