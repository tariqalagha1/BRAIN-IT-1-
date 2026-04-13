"use client";

import { useEffect, useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import NavBar from "@/components/NavBar";
import { apiRequest } from "@/lib/api";

type DashboardSummary = {
  active_patients: number;
  completed_sessions: number;
  open_tasks: number;
  monthly_revenue: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<DashboardSummary>("/dashboard/summary", { auth: true })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, []);

  return (
    <AuthGuard>
      <NavBar />
      <main className="page">
        <h1>Dashboard</h1>
        {error ? <p className="error">{error}</p> : null}
        {!data ? (
          <p className="state-text">Loading dashboard...</p>
        ) : (
          <section className="grid">
            <article className="card">
              <div className="label">Active patients</div>
              <div className="kpi">{data.active_patients}</div>
            </article>
            <article className="card">
              <div className="label">Completed sessions</div>
              <div className="kpi">{data.completed_sessions}</div>
            </article>
            <article className="card">
              <div className="label">Open tasks</div>
              <div className="kpi">{data.open_tasks}</div>
            </article>
            <article className="card">
              <div className="label">Monthly revenue</div>
              <div className="kpi">${data.monthly_revenue.toFixed(2)}</div>
            </article>
          </section>
        )}
      </main>
    </AuthGuard>
  );
}
