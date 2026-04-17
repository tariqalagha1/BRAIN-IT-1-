"use client";

import { ReactNode } from "react";

type StatusBadgeProps = {
  status: "pending" | "running" | "completed" | "failed";
  children?: ReactNode;
};

export default function StatusBadge({ status, children }: StatusBadgeProps) {
  const styles = {
    pending: "bg-slate-600 text-slate-200",
    running: "bg-blue-600 text-blue-100 animate-pulse",
    completed: "bg-green-700 text-green-100",
    failed: "bg-red-700 text-red-100",
  };

  const showSpinner = status === "running" || status === "pending";
  const spinnerClass = status === "pending" ? "border-slate-300 border-t-transparent" : "border-blue-100 border-t-transparent";

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {showSpinner && <span className={`inline-block h-3 w-3 animate-spin rounded-full border ${spinnerClass}`} />}
      {children || status}
    </span>
  );
}
