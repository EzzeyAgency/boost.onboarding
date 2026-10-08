"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="secondary-button" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
    }}>
      {copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? "Link copied" : "Copy page link"}
    </button>
  );
}
