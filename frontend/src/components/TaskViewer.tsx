"use client";

import { useCallback, useEffect, useState } from "react";

import A2ACalls from "@/components/A2ACalls";
import ExecutionTimeline from "@/components/ExecutionTimeline";
import JsonViewer from "@/components/JsonViewer";
import StatusBadge from "@/components/StatusBadge";
import { getTaskById, type TaskDetail } from "@/lib/api";

type TaskViewerProps = {
  initialTaskId?: string;
};

const activeStates = new Set(["pending", "running"]);

export default function TaskViewer({ initialTaskId = "" }: TaskViewerProps) {
  const [taskId, setTaskId] = useState(initialTaskId);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");

  const fetchTask = useCallback(
    async (targetTaskId?: string, showLoading = true) => {
      const id = (targetTaskId ?? taskId).trim();
      if (!id) {
        setError("Task ID is required.");
        return;
      }

      try {
        if (showLoading) setLoading(true);
        setError("");
        const response = await getTaskById(id);
        setTask(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch task");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [taskId]
  );

  useEffect(() => {
    if (!initialTaskId) return;
    setTaskId(initialTaskId);
    void fetchTask(initialTaskId);
  }, [initialTaskId, fetchTask]);

  useEffect(() => {
    if (!taskId || !task || !activeStates.has(task.status)) {
      setPolling(false);
      return;
    }

    setPolling(true);
    const interval = setInterval(() => {
      void fetchTask(taskId, false);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [task, taskId, fetchTask]);

  const executionSteps = task?.execution_steps;
  const a2aCalls = task?.a2a_calls;
  const outputPayload = task?.output_payload;
  const primaryResult =
    typeof outputPayload?.result === "string"
      ? outputPayload.result
      : typeof outputPayload?.echo === "string"
        ? outputPayload.echo
        : typeof outputPayload?.transformed_text === "string"
          ? outputPayload.transformed_text
          : typeof outputPayload?.transformed === "string"
            ? outputPayload.transformed
            : null;
  const executionTimeMs = task
    ? Math.max(0, new Date(task.updated_at).getTime() - new Date(task.created_at).getTime())
    : null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Task Status Viewer</h2>
          <p className="mt-1 text-sm text-slate-400">Lookup tasks and auto-poll while they are running.</p>
        </div>

        {/* Input section */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
            placeholder="Enter task_id"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-500/70 transition focus:ring"
          />
          <button
            type="button"
            onClick={() => void fetchTask()}
            disabled={loading}
            className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-800"
          >
            {loading ? "Checking..." : "Check Task"}
          </button>
        </div>

        {/* Status messages */}
        {polling && (
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
            Processing... (auto-refresh every 2 seconds)
          </div>
        )}
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>

      {/* Task details */}
      {task ? (
        <div className="mt-6 space-y-6">
          {/* Header info */}
          <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Task ID</p>
                <p className="mt-1 text-sm font-mono text-cyan-300 truncate">{task.task_id}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
                <div className="mt-1">
                  <StatusBadge status={task.status} />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Agent</p>
                <p className="mt-1 text-sm text-slate-300">{task.agent_used ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Execution Time</p>
                <p className="mt-1 text-sm text-slate-300">{executionTimeMs !== null ? `${executionTimeMs} ms` : "-"}</p>
              </div>
            </div>
          </div>

          {/* Final output */}
          {task.output_payload && (
            <div className="rounded-lg border border-green-700/50 bg-green-950/20 p-4">
              <p className="text-sm font-semibold text-green-300 mb-2">Final Result</p>
              {primaryResult ? (
                <p className="mb-4 text-2xl font-bold tracking-tight text-green-200">{primaryResult}</p>
              ) : null}
              <JsonViewer data={task.output_payload} defaultExpanded={true} />
            </div>
          )}

          {/* Execution timeline */}
          {executionSteps && executionSteps.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
              <ExecutionTimeline
                steps={executionSteps.map((step: Record<string, unknown>) => ({
                  step: (step.step as number) || 0,
                  agent: (step.agent as string) || "unknown",
                  service: (step.service as string) || "unknown",
                  input: (step.input as Record<string, unknown> | undefined),
                  output: (step.output as Record<string, unknown> | undefined),
                  status: (step.status as "completed" | "failed") || "completed",
                  error: (step.error as string | undefined),
                }))}
              />
            </div>
          )}

          {/* A2A calls */}
          {a2aCalls && a2aCalls.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
              <A2ACalls
                calls={a2aCalls.map((call: Record<string, unknown>) => ({
                  from_agent: (call.from_agent as string) || "unknown",
                  to_agent: (call.to_agent as string) || "unknown",
                  request: (call.request as Record<string, unknown> | undefined),
                  response: (call.response as Record<string, unknown> | undefined),
                  status: (call.status as "completed" | "failed") || "completed",
                }))}
              />
            </div>
          )}

          {/* Error message if any */}
          {task.error_message && (
            <div className="rounded-lg border border-red-700 bg-red-950/20 p-4">
              <p className="text-sm font-semibold text-red-300 mb-2">Error</p>
              <p className="text-sm text-red-200">{task.error_message}</p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
