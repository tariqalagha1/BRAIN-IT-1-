"use client";

import { useState } from "react";

type JsonViewerProps = {
  data: unknown;
  label?: string;
  defaultExpanded?: boolean;
};

export default function JsonViewer({ data, label, defaultExpanded = false }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-slate-100 transition"
      >
        <span className="text-cyan-400">{expanded ? "▼" : "▶"}</span>
        <span>{label || "JSON"}</span>
      </button>

      {expanded ? (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-cyan-200 font-mono max-h-96 overflow-y-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
