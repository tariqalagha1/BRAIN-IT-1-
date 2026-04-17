"use client";

import { useCallback, useEffect, useState } from "react";

import { listAgents, type RegisteredAgent } from "@/lib/api";

type HealthState = {
  state: "loading" | "healthy" | "failed";
  message?: string;
};

export default function AgentsList() {
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [healthByAgent, setHealthByAgent] = useState<Record<string, HealthState>>({});

  const checkHealth = useCallback(async (agent: RegisteredAgent) => {
    setHealthByAgent((current) => ({
      ...current,
      [agent.name]: { state: "loading" },
    }));

    try {
      const response = await fetch(agent.health_url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      setHealthByAgent((current) => ({
        ...current,
        [agent.name]: { state: "healthy" },
      }));
    } catch (healthError) {
      const message = healthError instanceof Error ? healthError.message : "Unreachable";
      setHealthByAgent((current) => ({
        ...current,
        [agent.name]: { state: "failed", message },
      }));
    }
  }, []);

  const refreshHealthChecks = useCallback(async (nextAgents: RegisteredAgent[]) => {
    await Promise.all(nextAgents.map((agent) => checkHealth(agent)));
  }, [checkHealth]);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await listAgents();
      setAgents(response);
      void refreshHealthChecks(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [refreshHealthChecks]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Registered Agents</h2>
            <p className="mt-1 text-sm text-slate-400">Available agents from Brain it Core.</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchAgents()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-300">Loading agents...</p>
        ) : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {!loading && !error ? (
          <div className="grid gap-4 md:grid-cols-2">
            {agents.map((agent) => (
              <article
                key={agent.name}
                className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 space-y-3 hover:border-slate-600 transition"
              >
                {/* Header */}
                <div className="space-y-1">
                  <p className="font-semibold text-cyan-300">{agent.name}</p>
                  <p className="text-xs text-slate-400">{agent.description}</p>
                </div>

                {/* Status */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-slate-900 px-2 py-1 inline-block">
                    <span className="text-xs font-semibold text-slate-300">registry: {agent.status}</span>
                  </div>
                  <div
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                      healthByAgent[agent.name]?.state === "healthy"
                        ? "bg-green-950/60 text-green-300 border border-green-800"
                        : healthByAgent[agent.name]?.state === "failed"
                          ? "bg-red-950/60 text-red-300 border border-red-800"
                          : "bg-slate-900 text-slate-300 border border-slate-700"
                    }`}
                  >
                    {healthByAgent[agent.name]?.state === "healthy" && "live: healthy"}
                    {healthByAgent[agent.name]?.state === "failed" && "live: failed"}
                    {(!healthByAgent[agent.name] || healthByAgent[agent.name]?.state === "loading") && "live: checking..."}
                  </div>
                </div>

                {/* Details grid */}
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Supported Tasks</p>
                    <p className="mt-0.5 text-slate-200">
                      {agent.supported_task_types.join(", ")}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Service</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-300 truncate">{agent.base_url}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Health Check</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-300 truncate">{agent.health_url}</p>
                    {healthByAgent[agent.name]?.state === "failed" && healthByAgent[agent.name]?.message ? (
                      <p className="mt-1 text-xs text-red-300">{healthByAgent[agent.name]?.message}</p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Run Endpoint</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-300 truncate">{agent.run_url}</p>
                  </div>
                </div>

                {/* Version */}
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                  v{agent.version}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && !error && agents.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No agents available.</p>
        ) : null}
      </div>
    </section>
  );
}
