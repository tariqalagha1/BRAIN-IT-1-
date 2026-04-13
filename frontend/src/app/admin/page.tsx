"use client";

import { useEffect, useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import NavBar from "@/components/NavBar";
import { apiRequest } from "@/lib/api";

type AdminSummary = {
  total_users: number;
  admins: number;
  clinicians: number;
};

export default function AdminPage() {
  const [data, setData] = useState<AdminSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<AdminSummary>("/admin/summary", { auth: true })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load admin view"));
  }, []);

  return (
    <AuthGuard>
      <NavBar />
      <main className="page">
        <h1>Admin</h1>
        {error ? <p className="error">{error}</p> : null}
        {!data ? (
          <p className="state-text">Loading admin metrics...</p>
        ) : (
          <section className="grid">
            <article className="card">
              <div className="label">Total users</div>
              <div className="kpi">{data.total_users}</div>
            </article>
            <article className="card">
              <div className="label">Admins</div>
              <div className="kpi">{data.admins}</div>
            </article>
            <article className="card">
              <div className="label">Clinicians</div>
              <div className="kpi">{data.clinicians}</div>
            </article>
          </section>
        )}
      </main>
    </AuthGuard>
  );
}
