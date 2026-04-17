"use client";

import { useEffect, useState } from "react";

import StatusBadge from "@/components/StatusBadge";
import {
  disableRegistryAgent,
  enableRegistryAgent,
  healthCheckRegistryAgent,
  listRegistryAgents,
  type RegistryManagedAgent,
} from "@/lib/api";

export default function RegistryManagementPanel() {
  const [agents, setAgents] = useState<RegistryManagedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);

  async function loadAgents() {
    try {
      setLoading(true);
      setError("");
      setAgents(await listRegistryAgents());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load registry agents");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAgent(agent: RegistryManagedAgent) {
    try {
      setBusyAgentId(agent.id);
      const updated = agent.is_enabled
        ? await disableRegistryAgent(agent.id)
        : await enableRegistryAgent(agent.id);
      setAgents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update agent state");
    } finally {
      setBusyAgentId(null);
    }
  }

  async function runHealthCheck(agentId: string) {
    try {
      setBusyAgentId(agentId);
      const updated = await healthCheckRegistryAgent(agentId);
      setAgents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed");
      await loadAgents();
    } finally {
      setBusyAgentId(null);
    }
  }

  useEffect(() => {
    void loadAgents();
  }, []);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Registry Management</h2>
          <p className="mt-1 text-sm text-slate-400">Persistent agent registry for the platform runtime.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadAgents()}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-300">Loading registry...</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {agents.map((agent) => (
          <article key={agent.id} className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div>
                  <p className="font-semibold text-cyan-300">{agent.name}</p>
                  <p className="text-xs text-slate-400">{agent.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={agent.status === "healthy" ? "completed" : agent.status === "unhealthy" ? "failed" : "pending"}>
                    {agent.status}
                  </StatusBadge>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      agent.is_enabled ? "bg-green-950/50 text-green-300" : "bg-red-950/50 text-red-300"
                    }`}
                  >
                    {agent.is_enabled ? "enabled" : "disabled"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void runHealthCheck(agent.id)}
                  disabled={busyAgentId === agent.id}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAgentId === agent.id ? "Working..." : "Health Check"}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleAgent(agent)}
                  disabled={busyAgentId === agent.id}
                  className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-800"
                >
                  {agent.is_enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Supported Tasks</p>
                <p className="mt-1">{agent.supported_task_types.join(", ")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Service URL</p>
                <p className="mt-1 font-mono text-xs">{agent.base_url}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Health URL</p>
                <p className="mt-1 font-mono text-xs">{agent.health_url}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Last Health Check</p>
                <p className="mt-1 text-xs">{agent.last_health_check_at ?? "Never"}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
