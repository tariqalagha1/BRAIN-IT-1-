"use client";

import JsonViewer from "./JsonViewer";
import StatusBadge from "./StatusBadge";

type A2ACall = {
  from_agent: string;
  to_agent: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  status: "completed" | "failed";
};

type A2ACallsProps = {
  calls: A2ACall[];
};

export default function A2ACalls({ calls }: A2ACallsProps) {
  if (!calls || calls.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">Agent-to-Agent Calls</h3>

      <div className="space-y-3">
        {calls.map((call, idx) => (
          <div key={idx} className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-purple-300">{call.from_agent}</span>
                <span className="text-slate-500">→</span>
                <span className="text-sm font-semibold text-purple-300">{call.to_agent}</span>
              </div>
              <StatusBadge status={call.status} />
            </div>

            <div className="space-y-2">
              {call.request && <JsonViewer data={call.request} label="Request" />}
              {call.response && <JsonViewer data={call.response} label="Response" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
