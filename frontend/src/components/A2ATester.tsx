"use client";

import { useState } from "react";

import JsonViewer from "@/components/JsonViewer";
import StatusBadge from "@/components/StatusBadge";
import { runEchoAgent, type EchoAgentResponse } from "@/lib/api";

export default function A2ATester() {
  const [input, setInput] = useState("hello from control panel");
  const [result, setResult] = useState<EchoAgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestStatus, setRequestStatus] = useState<"idle" | "completed" | "failed">("idle");

  async function testEchoAgent() {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      const response = await runEchoAgent(input);
      setResult(response);
      setRequestStatus("completed");
    } catch (err) {
      setRequestStatus("failed");
      setError(err instanceof Error ? err.message : "A2A test failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">A2A Tester</h2>
          <p className="mt-1 text-sm text-slate-400">Send a direct test call to echo agent endpoint.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-500/70 transition focus:ring"
            placeholder="Text for echo agent"
          />
          <button
            type="button"
            onClick={() => void testEchoAgent()}
            disabled={loading}
            className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-800"
          >
            {loading ? "Testing..." : "Test Echo Agent"}
          </button>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>

      {requestStatus !== "idle" ? (
        <div className="mt-6 space-y-4">
          {/* Status indicator */}
          <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">A2A Call Status</p>
              <StatusBadge status={requestStatus === "completed" ? "completed" : "failed"}>
                {requestStatus === "completed" ? "Direct Call Successful" : "Direct Call Failed"}
              </StatusBadge>
            </div>
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </div>

          {/* Output */}
          {result?.output && (
            <div className="rounded-lg border border-green-700/50 bg-green-950/20 p-4">
              <p className="text-sm font-semibold text-green-300 mb-3">Output</p>
              <JsonViewer data={result.output} defaultExpanded={true} />
            </div>
          )}

          {/* Execution steps */}
          {result?.execution_steps && result.execution_steps.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-300">Execution Steps</p>
              {result.execution_steps.map((step, idx) => {
                const agentName =
                  typeof step === "object" && step !== null && "agent" in step
                    ? String((step as Record<string, unknown>).agent)
                    : "unknown";
                return (
                  <div key={idx} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="text-xs text-cyan-400 font-semibold">
                      Step {idx + 1}: {agentName}
                    </p>
                    <JsonViewer data={step} label="Details" />
                  </div>
                );
              })}
            </div>
          )}

          {/* A2A calls */}
          {result?.a2a_calls && result.a2a_calls.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-300">Agent-to-Agent Calls</p>
              {result.a2a_calls.map((call, idx) => {
                const fromAgent =
                  typeof call === "object" && call !== null && "from_agent" in call
                    ? String((call as Record<string, unknown>).from_agent)
                    : "unknown";
                const toAgent =
                  typeof call === "object" && call !== null && "to_agent" in call
                    ? String((call as Record<string, unknown>).to_agent)
                    : "unknown";
                return (
                  <div key={idx} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="text-xs text-purple-400 font-semibold mb-2">
                      {fromAgent} → {toAgent}
                    </p>
                    <JsonViewer data={call} label="Call Details" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
