"use client";

import { useEffect, useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import NavBar from "@/components/NavBar";
import { apiRequest } from "@/lib/api";

type Invoice = {
  id: number;
  amount: number;
  status: string;
  note: string;
  created_at: string;
};

type BillingSummary = {
  plans: string[];
  invoices: Invoice[];
};

export default function BillingPage() {
  const [data, setData] = useState<BillingSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<BillingSummary>("/billing/summary", { auth: true })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load billing"));
  }, []);

  return (
    <AuthGuard>
      <NavBar />
      <main className="page">
        <h1>Billing</h1>
        {error ? <p className="error">{error}</p> : null}
        {!data ? (
          <p className="state-text">Loading billing...</p>
        ) : (
          <>
            <section className="card">
              <h2>Available plans</h2>
              <div className="grid">
                {data.plans.map((plan) => (
                  <article key={plan} className="card">
                    <div className="kpi" style={{ fontSize: "1.2rem" }}>
                      {plan}
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="card" style={{ marginTop: "1rem" }}>
              <h2>Invoices</h2>
              {data.invoices.length === 0 ? (
                <p className="state-text">No invoices yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.id}</td>
                        <td>${invoice.amount.toFixed(2)}</td>
                        <td>{invoice.status}</td>
                        <td>{invoice.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </AuthGuard>
  );
}
