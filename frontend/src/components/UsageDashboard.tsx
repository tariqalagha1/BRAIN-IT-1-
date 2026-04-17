"use client";

import { useEffect, useState } from "react";

import { getUsageLimits, getUsageSummary, type UsageLimits, type UsageSummary } from "@/lib/api";

export default function UsageDashboard() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsage() {
    try {
      setLoading(true);
      setError("");
      const [summaryResponse, limitsResponse] = await Promise.all([getUsageSummary(), getUsageLimits()]);
      setSummary(summaryResponse);
      setLimits(limitsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsage();
  }, []);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Usage Dashboard</h2>
          <p className="mt-1 text-sm text-slate-400">Tenant usage visibility with daily limits and task outcomes.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadUsage()}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-300">Loading usage...</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

      {!loading && !error && summary && limits ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tasks Today</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">{summary.tasks_today}</p>
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Usage</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">{summary.total_tasks}</p>
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Remaining Quota</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {limits.remaining_quota === null ? "Unlimited" : limits.remaining_quota}
            </p>
            <p className="mt-1 text-xs text-slate-500">plan: {limits.plan_type}</p>
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Success / Failed</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {summary.success_count} / {summary.failure_count}
            </p>
          </article>
        </div>
      ) : null}
    </section>
  );
}
