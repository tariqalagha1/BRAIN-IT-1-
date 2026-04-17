"use client";

import JsonViewer from "./JsonViewer";
import StatusBadge from "./StatusBadge";

type ExecutionStep = {
  step: number;
  agent: string;
  service: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "completed" | "failed";
  error?: string;
};

type ExecutionTimelineProps = {
  steps: ExecutionStep[];
};

export default function ExecutionTimeline({ steps }: ExecutionTimelineProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-slate-300">Execution Timeline</h3>

      <div className="relative space-y-4 pl-6">
        {steps.map((step, idx) => (
          <div key={step.step} className="relative">
            {/* Timeline dot and line */}
            <div className="absolute -left-6 top-2 w-4 h-4 rounded-full border-2 border-slate-700 bg-slate-900" />
            {idx < steps.length - 1 && (
              <div className="absolute -left-5 top-6 w-0.5 h-12 bg-slate-700" />
            )}

            {/* Step card */}
            <article className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-cyan-300">
                    Step {step.step}: {step.agent}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{step.service}</p>
                </div>
                <StatusBadge status={step.status} />
              </div>

              {step.error && (
                <div className="mb-3 rounded-lg bg-red-950/40 border border-red-900 p-2">
                  <p className="text-xs text-red-300">{step.error}</p>
                </div>
              )}

              <div className="space-y-2">
                {step.input && <JsonViewer data={step.input} label="Input" />}
                {step.output && <JsonViewer data={step.output} label="Output" />}
              </div>
            </article>
          </div>
        ))}
      </div>
    </div>
  );
}
