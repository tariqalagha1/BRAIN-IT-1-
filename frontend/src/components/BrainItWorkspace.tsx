"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import A2ATester from "@/components/A2ATester";
import AgentsList from "@/components/AgentsList";
import ApiKeysPanel from "@/components/ApiKeysPanel";
import RegistryManagementPanel from "@/components/RegistryManagementPanel";
import StatusBadge from "@/components/StatusBadge";
import TaskViewer from "@/components/TaskViewer";
import {
  createApiKey,
  createTask,
  getTaskById,
  getUsageLimits,
  getUsageSummary,
  listAgents,
  listApiKeys,
  type ApiKeyCreateResponse,
  type ApiKeyMetadata,
  type OrchestrateResponse,
  type RegisteredAgent,
  type TaskDetail,
  type TaskType,
  type UsageLimits,
  type UsageSummary,
} from "@/lib/api";
import {
  clearStoredBrainItApiKey,
  getOnboardingCompleted,
  getStoredBrainItApiKey,
  getStoredRecentTasks,
  setOnboardingCompleted,
  setStoredBrainItApiKey,
  upsertStoredRecentTask,
  type StoredBrainItApiKey,
} from "@/lib/brainit";

type AgentHealthState = "checking" | "healthy" | "offline";

type KeyDraft = {
  clientName: string;
  tenantId: string;
  planType: "free" | "pro" | "enterprise";
};

type ManualKeyDraft = {
  plaintextKey: string;
  clientName: string;
  tenantId: string;
  planType: "free" | "pro" | "enterprise";
};

type SummaryCardProps = {
  label: string;
  value: string | number;
  note: string;
  tone?: "default" | "accent";
};

const taskTypeOptions: { value: TaskType; label: string; description: string }[] = [
  { value: "echo", label: "Echo", description: "Returns the same text back." },
  { value: "transform", label: "Transform", description: "Transforms text with a single agent." },
  { value: "echo_transform", label: "Echo + Transform", description: "Runs the guided A2A flow." },
];

const onboardingLabels = ["Welcome", "Create API key", "Run first task", "View result"];

function formatDate(value?: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTaskLabel(taskType: string): string {
  return taskType.replaceAll("_", " ");
}

function extractPrimaryResult(task: Pick<TaskDetail, "output_payload"> | Pick<OrchestrateResponse, "output_payload"> | null): string {
  const payload = task?.output_payload;
  if (!payload) return "No result yet";
  const candidates = [payload.result, payload.transformed, payload.transformed_text, payload.echo];
  const firstString = candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return firstString ?? JSON.stringify(payload);
}

function SummaryCard({ label, value, note, tone = "default" }: SummaryCardProps) {
  return (
    <article
      className={`rounded-[1.5rem] border p-5 shadow-sm ${
        tone === "accent"
          ? "border-[color:var(--line-strong)] bg-[color:var(--card-strong)]"
          : "border-[color:var(--line)] bg-[color:var(--card)]"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--ink)]">{value}</p>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{note}</p>
    </article>
  );
}

function BrandMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--line-strong)] bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] text-lg font-semibold text-white shadow-[0_16px_40px_rgba(32,108,117,0.22)]">
      B
    </div>
  );
}

function ResultView({ task }: { task: TaskDetail | null }) {
  if (!task) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-[color:var(--line)] bg-[color:var(--card)] p-6">
        <h3 className="text-lg font-semibold text-[color:var(--ink)]">Result</h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Run a task to see the final output, execution trail, and A2A flow in one place.
        </p>
      </section>
    );
  }

  const result = extractPrimaryResult(task);
  const steps = task.execution_steps ?? [];
  const calls = task.a2a_calls ?? [];

  return (
    <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Result</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--ink)]">{formatTaskLabel(task.task_type)}</h3>
          <p className="mt-2 text-sm text-[color:var(--muted)]">Task ID {task.task_id.slice(0, 8)} • {formatDate(task.updated_at)}</p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div className="mt-6 rounded-[1.4rem] border border-[color:var(--line)] bg-white px-5 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">Final result</p>
        <p className="mt-3 text-3xl font-semibold leading-tight text-[color:var(--ink)]">{result}</p>
      </div>

      {calls.length > 0 ? (
        <div className="mt-6 rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">A2A flow</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {steps.map((step, index) => (
              <div key={`${step.agent}-${index}`} className="flex items-center gap-3">
                <div className="rounded-full border border-[color:var(--line-strong)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--ink)]">
                  {typeof step.agent === "string" ? step.agent : `step ${index + 1}`}
                </div>
                {index < steps.length - 1 ? <span className="text-[color:var(--accent)]">→</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        <details className="group rounded-[1.2rem] border border-[color:var(--line)] bg-white p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-[color:var(--ink)]">
            Execution steps
          </summary>
          <div className="mt-4 space-y-3 text-sm text-[color:var(--muted)]">
            {steps.length === 0 ? <p>No execution steps recorded.</p> : null}
            {steps.map((step, index) => (
              <div key={`${step.agent}-${index}`} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[color:var(--ink)]">{typeof step.agent === "string" ? step.agent : `Step ${index + 1}`}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                      {typeof step.service === "string" ? step.service : "orchestration"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[color:var(--card-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">
                    {typeof step.status === "string" ? step.status : "completed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>

        {task.output_payload ? (
          <details className="rounded-[1.2rem] border border-[color:var(--line)] bg-white p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-[color:var(--ink)]">Raw payload</summary>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-[color:var(--surface)] p-4 text-xs text-[color:var(--muted)]">
              {JSON.stringify(task.output_payload, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </section>
  );
}

export default function BrainItWorkspace() {
  const [apiKeys, setApiKeys] = useState<ApiKeyMetadata[]>([]);
  const [activeKey, setActiveKey] = useState<StoredBrainItApiKey | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [agentHealth, setAgentHealth] = useState<Record<string, AgentHealthState>>({});
  const [recentTasks, setRecentTasks] = useState<TaskDetail[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [taskType, setTaskType] = useState<TaskType>("echo_transform");
  const [taskText, setTaskText] = useState("hello world");
  const [showAdvancedComposer, setShowAdvancedComposer] = useState(false);
  const [composerMetadata, setComposerMetadata] = useState("{}");
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [usageError, setUsageError] = useState("");
  const [agentError, setAgentError] = useState("");
  const [keyError, setKeyError] = useState("");
  const [keyLoading, setKeyLoading] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false);
  const [showCreateKeyForm, setShowCreateKeyForm] = useState(false);
  const [showManualKeyForm, setShowManualKeyForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyCreateResponse | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState<KeyDraft>({
    clientName: "Product Console",
    tenantId: "workspace-main",
    planType: "free",
  });
  const [manualKeyDraft, setManualKeyDraft] = useState<ManualKeyDraft>({
    plaintextKey: "",
    clientName: "Imported key",
    tenantId: "workspace-main",
    planType: "free",
  });

  const composerRef = useRef<HTMLElement | null>(null);
  const agentsRef = useRef<HTMLElement | null>(null);
  const keyPanelRef = useRef<HTMLElement | null>(null);

  const activeKeyMetadata = useMemo(
    () => apiKeys.find((item) => item.id === activeKey?.id) ?? null,
    [activeKey, apiKeys]
  );
  const hasTaskHistory = recentTasks.length > 0 || (usageSummary?.total_tasks ?? 0) > 0;
  const firstTaskSuggested = !hasTaskHistory && taskType === "echo_transform";

  useEffect(() => {
    setActiveKey(getStoredBrainItApiKey());
    setOnboardingOpen(!getOnboardingCompleted());
  }, []);

  useEffect(() => {
    async function loadAgentsWithHealth() {
      try {
        setAgentError("");
        const items = await listAgents();
        setAgents(items);
        const healthEntries = await Promise.all(
          items.map(async (agent) => {
            try {
              const response = await fetch(agent.health_url, { cache: "no-store" });
              return [agent.name, response.ok ? "healthy" : "offline"] as const;
            } catch {
              return [agent.name, "offline"] as const;
            }
          })
        );
        setAgentHealth(Object.fromEntries(healthEntries));
      } catch (error) {
        setAgentError(error instanceof Error ? error.message : "Failed to load agents");
      }
    }

    void loadAgentsWithHealth();
  }, []);

  useEffect(() => {
    async function loadKeys() {
      try {
        const items = await listApiKeys();
        setApiKeys(items);
      } catch (error) {
        setKeyError(error instanceof Error ? error.message : "Failed to load API keys");
      }
    }

    void loadKeys();
  }, [newlyCreatedKey]);

  useEffect(() => {
    async function loadRecentTaskDetails() {
      const stored = getStoredRecentTasks();
      if (stored.length === 0) {
        setRecentTasks([]);
        return;
      }

      const results = await Promise.all(
        stored.map(async (item) => {
          try {
            return await getTaskById(item.taskId);
          } catch {
            return null;
          }
        })
      );

      const nextTasks = results.filter((item): item is TaskDetail => Boolean(item));
      nextTasks.sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());
      setRecentTasks(nextTasks);
      setSelectedTask((current) => current ?? nextTasks[0] ?? null);
    }

    void loadRecentTaskDetails();
  }, [taskLoading]);

  useEffect(() => {
    async function loadUsage() {
      if (!activeKey) {
        setUsageSummary(null);
        setUsageLimits(null);
        setUsageError("");
        return;
      }

      try {
        setUsageError("");
        const [summary, limits] = await Promise.all([getUsageSummary(), getUsageLimits()]);
        setUsageSummary(summary);
        setUsageLimits(limits);
      } catch (error) {
        setUsageSummary(null);
        setUsageLimits(null);
        setUsageError(error instanceof Error ? error.message : "Failed to load usage");
      }
    }

    void loadUsage();
  }, [activeKey, selectedTask, newlyCreatedKey]);

  function focusSection(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyToClipboard(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1400);
    } catch {
      setKeyError("Copy failed. Please copy it manually.");
    }
  }

  async function handleCreateKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKeyError("");

    if (!keyDraft.clientName.trim() || !keyDraft.tenantId.trim()) {
      setKeyError("Client name and workspace ID are required.");
      return;
    }

    try {
      setKeyLoading(true);
      const created = await createApiKey({
        client_name: keyDraft.clientName.trim(),
        tenant_id: keyDraft.tenantId.trim(),
        plan_type: keyDraft.planType,
      });
      const storedKey: StoredBrainItApiKey = {
        id: created.id,
        plaintextKey: created.plaintext_key,
        keyPrefix: created.key_prefix,
        clientName: created.client_name,
        tenantId: created.tenant_id,
        planType: created.plan_type,
        createdAt: created.created_at,
        source: "created",
      };
      setStoredBrainItApiKey(storedKey);
      setActiveKey(storedKey);
      setNewlyCreatedKey(created);
      setShowCreateKeyForm(false);
      if (onboardingOpen && onboardingStep < 2) {
        setOnboardingStep(2);
      }
    } catch (error) {
      setKeyError(error instanceof Error ? error.message : "Failed to create API key");
    } finally {
      setKeyLoading(false);
    }
  }

  function handleUseExistingKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKeyError("");

    if (!manualKeyDraft.plaintextKey.trim()) {
      setKeyError("Paste an API key to continue.");
      return;
    }

    const storedKey: StoredBrainItApiKey = {
      id: `manual-${Date.now()}`,
      plaintextKey: manualKeyDraft.plaintextKey.trim(),
      keyPrefix: manualKeyDraft.plaintextKey.trim().slice(0, 12),
      clientName: manualKeyDraft.clientName.trim() || "Imported key",
      tenantId: manualKeyDraft.tenantId.trim() || "workspace-main",
      planType: manualKeyDraft.planType,
      createdAt: new Date().toISOString(),
      source: "manual",
    };

    setStoredBrainItApiKey(storedKey);
    setActiveKey(storedKey);
    setShowManualKeyForm(false);
    if (onboardingOpen && onboardingStep < 2) {
      setOnboardingStep(2);
    }
  }

  async function handleRunTask(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setTaskError("");

    if (!taskText.trim()) {
      setTaskError("Add text to run a task.");
      return;
    }

    let metadata: Record<string, unknown> | undefined;
    if (showAdvancedComposer && composerMetadata.trim()) {
      try {
        metadata = JSON.parse(composerMetadata) as Record<string, unknown>;
      } catch {
        setTaskError("Advanced metadata must be valid JSON.");
        return;
      }
    }

    try {
      setTaskLoading(true);
      const response = await createTask({
        task_type: taskType,
        input_payload: { text: taskText.trim() },
        metadata,
      });
      const fullTask = await getTaskById(response.task_id).catch(() => null);
      if (fullTask) {
        upsertStoredRecentTask({
          taskId: fullTask.task_id,
          taskType: fullTask.task_type,
          status: fullTask.status,
          createdAt: fullTask.created_at,
        });
        setSelectedTask(fullTask);
        setRecentTasks((current) => {
          const next = [fullTask, ...current.filter((item) => item.task_id !== fullTask.task_id)];
          return next.slice(0, 8);
        });
      }

      if (onboardingOpen && onboardingStep < 3) {
        setOnboardingStep(3);
      }
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Task execution failed");
    } finally {
      setTaskLoading(false);
    }
  }

  function dismissOnboarding() {
    setOnboardingCompleted(true);
    setOnboardingOpen(false);
  }

  function resetToFirstTask() {
    setTaskType("echo_transform");
    setTaskText("hello world");
    focusSection(composerRef);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(114,193,201,0.22),transparent_22%),radial-gradient(circle_at_top_right,rgba(255,204,122,0.26),transparent_24%),linear-gradient(180deg,#f7f2e8_0%,#fbfaf6_52%,#f4f7f6_100%)] px-4 py-6 text-[color:var(--ink)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="grid gap-5 rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-[0_24px_80px_rgba(10,25,47,0.08)] lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
          <div>
            <div className="flex items-center gap-4">
              <BrandMark />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">Brain it</p>
                <h1 className="mt-1 text-4xl font-semibold tracking-tight text-[color:var(--ink)]">AI Orchestration Platform</h1>
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
              Orchestrate multi-agent AI tasks with a product-grade dashboard that guides first-time users from key creation to their first successful result.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => focusSection(composerRef)}
                className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
              >
                Run Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setOnboardingOpen(true);
                  setOnboardingStep(0);
                }}
                className="rounded-full border border-[color:var(--line-strong)] px-5 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              >
                Get Started
              </button>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(241,248,247,0.94))] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">Launch-ready flow</p>
            <ol className="mt-4 space-y-4 text-sm text-[color:var(--muted)]">
              {[
                "Create an API key for your workspace.",
                "Run a guided first task in one click.",
                "Review the final output and A2A path.",
              ].map((item, index) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--card-strong)] text-xs font-semibold text-[color:var(--accent)]">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total tasks" value={usageSummary?.total_tasks ?? "--"} note={activeKey ? "Across this workspace" : "Add an API key to unlock usage tracking"} tone="accent" />
          <SummaryCard label="Tasks today" value={usageSummary?.tasks_today ?? "--"} note="Daily activity" />
          <SummaryCard label="Remaining quota" value={usageLimits?.remaining_quota ?? "--"} note={usageLimits ? `Daily limit ${usageLimits.daily_limit ?? "Unlimited"}` : "Quota appears after connecting a key"} />
          <SummaryCard label="Plan type" value={usageLimits?.plan_type ?? activeKey?.planType ?? "--"} note={activeKey ? `Workspace ${activeKey.tenantId}` : "Free, Pro, or Enterprise"} />
        </section>

        <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">Main actions</p>
              <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">Everything a new user needs in under 60 seconds</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => focusSection(composerRef)} className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92">
                Run Task
              </button>
              <button type="button" onClick={() => focusSection(keyPanelRef)} className="rounded-full border border-[color:var(--line-strong)] px-5 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]">
                Create API key
              </button>
              <button type="button" onClick={() => focusSection(agentsRef)} className="rounded-full border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--ink)]">
                View agents
              </button>
            </div>
          </div>
          {usageError ? <p className="mt-4 text-sm text-amber-700">{usageError}</p> : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section ref={composerRef} className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">Task runner</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">Run a task without touching raw JSON</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
                  Pick a task type, add plain text, and let Brain it orchestrate the right agent chain.
                </p>
              </div>
              {firstTaskSuggested ? (
                <span className="rounded-full bg-[color:var(--card-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">Run your first task</span>
              ) : null}
            </div>

            {firstTaskSuggested ? (
              <div className="mt-5 rounded-[1.25rem] border border-[color:var(--line-strong)] bg-[color:var(--card-strong)] p-4 text-sm text-[color:var(--ink)]">
                <p className="font-semibold">Guided first task</p>
                <p className="mt-1 text-[color:var(--muted)]">We prefilled <span className="font-medium text-[color:var(--ink)]">echo_transform</span> with <span className="font-medium text-[color:var(--ink)]">hello world</span> so you can see orchestration and A2A immediately.</p>
                <button type="button" onClick={resetToFirstTask} className="mt-3 rounded-full border border-[color:var(--line-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--accent)]">
                  Use recommended task
                </button>
              </div>
            ) : null}

            <form onSubmit={(event) => void handleRunTask(event)} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-[0.95fr_1.35fr]">
                <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                  Task type
                  <select
                    value={taskType}
                    onChange={(event) => setTaskType(event.target.value as TaskType)}
                    className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)]"
                  >
                    {taskTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                  Input text
                  <input
                    value={taskText}
                    onChange={(event) => setTaskText(event.target.value)}
                    placeholder="Type the text you want to process"
                    className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)]"
                  />
                </label>
              </div>

              <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--ink)]">Selected flow</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">{taskTypeOptions.find((option) => option.value === taskType)?.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedComposer((current) => !current)}
                    className="text-sm font-semibold text-[color:var(--accent)]"
                  >
                    {showAdvancedComposer ? "Hide advanced" : "Show advanced"}
                  </button>
                </div>

                {showAdvancedComposer ? (
                  <div className="mt-4">
                    <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                      Metadata JSON
                      <textarea
                        value={composerMetadata}
                        onChange={(event) => setComposerMetadata(event.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)]"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              {taskError ? <p className="text-sm text-rose-600">{taskError}</p> : null}

              <button
                type="submit"
                disabled={taskLoading}
                className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {taskLoading ? "Running..." : "Run"}
              </button>
            </form>
          </section>

          <section ref={keyPanelRef} className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">API key</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">Connect your workspace</h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">Usage, quota, and guided orchestration work best when this dashboard has an active API key.</p>

            <div className="mt-5 rounded-[1.4rem] border border-[color:var(--line)] bg-white p-4">
              {activeKey ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-[color:var(--ink)]">{activeKey.clientName}</p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{activeKey.tenantId} • {activeKey.planType} plan</p>
                    </div>
                    <span className="rounded-full bg-[color:var(--card-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">{activeKey.source === "manual" ? "Imported" : "Stored in browser"}</span>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">Key prefix</p>
                    <p className="mt-2 font-mono text-sm text-[color:var(--ink)]">{activeKey.keyPrefix}</p>
                    <p className="mt-3 text-xs text-[color:var(--muted)]">Last used {formatDate(activeKeyMetadata?.last_used_at ?? null)}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => void copyToClipboard(activeKey.plaintextKey, "active-key")} className="rounded-full border border-[color:var(--line-strong)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)]">
                      {copied === "active-key" ? "Copied" : "Copy key"}
                    </button>
                    <button type="button" onClick={() => setShowCreateKeyForm((current) => !current)} className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]">
                      Create another key
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearStoredBrainItApiKey();
                        setActiveKey(null);
                      }}
                      className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-[color:var(--muted)]"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-[color:var(--muted)]">No API key connected yet.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setShowCreateKeyForm(true)} className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white">
                      Create API key
                    </button>
                    <button type="button" onClick={() => setShowManualKeyForm((current) => !current)} className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]">
                      Use existing key
                    </button>
                  </div>
                </div>
              )}
            </div>

            {showCreateKeyForm ? (
              <form onSubmit={handleCreateKey} className="mt-5 space-y-4 rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                    Client name
                    <input value={keyDraft.clientName} onChange={(event) => setKeyDraft((current) => ({ ...current, clientName: event.target.value }))} className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                    Workspace ID
                    <input value={keyDraft.tenantId} onChange={(event) => setKeyDraft((current) => ({ ...current, tenantId: event.target.value }))} className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]" />
                  </label>
                </div>
                <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                  Plan
                  <select value={keyDraft.planType} onChange={(event) => setKeyDraft((current) => ({ ...current, planType: event.target.value as KeyDraft["planType"] }))} className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </label>
                <button type="submit" disabled={keyLoading} className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-55">
                  {keyLoading ? "Creating..." : "Create API key"}
                </button>
              </form>
            ) : null}

            {showManualKeyForm ? (
              <form onSubmit={handleUseExistingKey} className="mt-5 space-y-4 rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
                <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                  Existing plaintext key
                  <textarea value={manualKeyDraft.plaintextKey} onChange={(event) => setManualKeyDraft((current) => ({ ...current, plaintextKey: event.target.value }))} rows={3} className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                    Label
                    <input value={manualKeyDraft.clientName} onChange={(event) => setManualKeyDraft((current) => ({ ...current, clientName: event.target.value }))} className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                    Workspace ID
                    <input value={manualKeyDraft.tenantId} onChange={(event) => setManualKeyDraft((current) => ({ ...current, tenantId: event.target.value }))} className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]" />
                  </label>
                </div>
                <button type="submit" className="rounded-full border border-[color:var(--line-strong)] px-5 py-3 text-sm font-semibold text-[color:var(--accent)]">
                  Use this key
                </button>
              </form>
            ) : null}

            {newlyCreatedKey ? (
              <div className="mt-5 rounded-[1.4rem] border border-[color:var(--line-strong)] bg-[color:var(--card-strong)] p-4">
                <p className="text-sm font-semibold text-[color:var(--ink)]">Save this key now</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">It will not be shown again by the API.</p>
                <p className="mt-3 break-all rounded-2xl bg-white p-4 font-mono text-xs text-[color:var(--ink)]">{newlyCreatedKey.plaintext_key}</p>
              </div>
            ) : null}

            {keyError ? <p className="mt-4 text-sm text-rose-600">{keyError}</p> : null}
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <ResultView task={selectedTask} />

          <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">Activity</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">Recent tasks</h2>
              </div>
              <span className="rounded-full bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]">Quick view</span>
            </div>

            <div className="mt-5 space-y-3">
              {recentTasks.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-[color:var(--line)] bg-[color:var(--surface)] p-5">
                  <p className="font-semibold text-[color:var(--ink)]">No activity yet</p>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">Your first successful task will appear here with a quick link back to the result view.</p>
                </div>
              ) : null}

              {recentTasks.map((task) => (
                <article key={task.task_id} className="rounded-[1.35rem] border border-[color:var(--line)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--ink)]">{formatTaskLabel(task.task_type)}</p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{extractPrimaryResult(task)}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-[color:var(--muted)]">{formatDate(task.updated_at)}</p>
                    <button type="button" onClick={() => setSelectedTask(task)} className="text-sm font-semibold text-[color:var(--accent)]">
                      View
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section ref={agentsRef} className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">Agents</p>
              <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">Your orchestration network</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">User-friendly visibility into the agents available to this workspace.</p>
            </div>
          </div>
          {agentError ? <p className="mt-4 text-sm text-rose-600">{agentError}</p> : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {agents.map((agent) => (
              <article key={agent.name} className="rounded-[1.4rem] border border-[color:var(--line)] bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--ink)]">{agent.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{agent.description}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${agentHealth[agent.name] === "healthy" ? "bg-emerald-100 text-emerald-700" : agentHealth[agent.name] === "offline" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
                    {agentHealth[agent.name] ?? "checking"}
                  </span>
                </div>
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">Supported tasks</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {agent.supported_task_types.map((task) => (
                      <span key={task} className="rounded-full bg-[color:var(--surface)] px-3 py-1 text-xs font-medium text-[color:var(--ink)]">
                        {formatTaskLabel(task)}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <details className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-sm" open={advancedToolsOpen} onToggle={(event) => setAdvancedToolsOpen((event.currentTarget as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer list-none text-lg font-semibold text-[color:var(--ink)]">Advanced tools</summary>
          <p className="mt-2 text-sm text-[color:var(--muted)]">Power-user panels remain available here for direct inspection, registry management, raw task lookup, and A2A testing.</p>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <TaskViewer initialTaskId={selectedTask?.task_id} />
            <ApiKeysPanel />
            <AgentsList />
            <A2ATester />
            <RegistryManagementPanel />
          </div>
        </details>
      </div>

      {onboardingOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.32)] px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">Onboarding</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--ink)]">{onboardingLabels[onboardingStep]}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[color:var(--ink)]">Step {onboardingStep + 1} / 4</p>
                <div className="mt-3 flex gap-2">
                  {onboardingLabels.map((label, index) => (
                    <span key={label} className={`h-2.5 w-14 rounded-full ${index <= onboardingStep ? "bg-[color:var(--accent)]" : "bg-[color:var(--line)]"}`} />
                  ))}
                </div>
              </div>
            </div>

            {onboardingStep === 0 ? (
              <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="text-lg leading-8 text-[color:var(--muted)]">
                    Brain it helps you orchestrate AI tasks across multiple agents without exposing the underlying plumbing to end users.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-[color:var(--muted)]">
                    <li>• Create one API key for your workspace.</li>
                    <li>• Run a first task with a recommended flow.</li>
                    <li>• Review the final result and the A2A path.</li>
                  </ul>
                </div>
                <div className="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5">
                  <p className="text-sm font-semibold text-[color:var(--ink)]">What you’ll do next</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">Get started by generating a key, then run the recommended <span className="font-medium text-[color:var(--ink)]">echo_transform</span> task to see orchestration in action.</p>
                </div>
              </div>
            ) : null}

            {onboardingStep === 1 ? (
              <form onSubmit={handleCreateKey} className="mt-8 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                    Client name
                    <input value={keyDraft.clientName} onChange={(event) => setKeyDraft((current) => ({ ...current, clientName: event.target.value }))} className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                    Workspace ID
                    <input value={keyDraft.tenantId} onChange={(event) => setKeyDraft((current) => ({ ...current, tenantId: event.target.value }))} className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]" />
                  </label>
                </div>
                <label className="space-y-2 text-sm font-medium text-[color:var(--ink)]">
                  Plan
                  <select value={keyDraft.planType} onChange={(event) => setKeyDraft((current) => ({ ...current, planType: event.target.value as KeyDraft["planType"] }))} className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </label>
                {newlyCreatedKey ? (
                  <div className="rounded-[1.4rem] border border-[color:var(--line-strong)] bg-[color:var(--card-strong)] p-4">
                    <p className="text-sm font-semibold text-[color:var(--ink)]">Key created</p>
                    <p className="mt-2 break-all rounded-2xl bg-white p-4 font-mono text-xs text-[color:var(--ink)]">{newlyCreatedKey.plaintext_key}</p>
                  </div>
                ) : null}
                {keyError ? <p className="text-sm text-rose-600">{keyError}</p> : null}
                <button type="submit" disabled={keyLoading} className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-55">
                  {keyLoading ? "Creating..." : "Create API key"}
                </button>
              </form>
            ) : null}

            {onboardingStep === 2 ? (
              <div className="mt-8 space-y-5">
                <div className="rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5">
                  <p className="text-sm font-semibold text-[color:var(--ink)]">Recommended first task</p>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">Task type <span className="font-medium text-[color:var(--ink)]">echo_transform</span> with input <span className="font-medium text-[color:var(--ink)]">hello world</span>.</p>
                </div>
                <button type="button" onClick={() => void handleRunTask()} disabled={taskLoading} className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-55">
                  {taskLoading ? "Running..." : "Run first task"}
                </button>
                {taskError ? <p className="text-sm text-rose-600">{taskError}</p> : null}
              </div>
            ) : null}

            {onboardingStep === 3 ? (
              <div className="mt-8 space-y-5">
                <div className="rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5">
                  <p className="text-sm font-semibold text-[color:var(--ink)]">Your first result</p>
                  <p className="mt-3 text-2xl font-semibold text-[color:var(--ink)]">{extractPrimaryResult(selectedTask)}</p>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">{selectedTask?.execution_steps?.length ?? 0} execution steps • {selectedTask?.a2a_calls?.length ?? 0} A2A calls</p>
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={dismissOnboarding} className="text-sm font-semibold text-[color:var(--muted)]">
                Skip for now
              </button>
              <div className="flex gap-3">
                {onboardingStep > 0 ? (
                  <button type="button" onClick={() => setOnboardingStep((current) => current - 1)} className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]">
                    Back
                  </button>
                ) : null}
                {onboardingStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep((current) => current + 1)}
                    disabled={(onboardingStep === 1 && !activeKey) || (onboardingStep === 2 && !selectedTask)}
                    className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-55"
                  >
                    Continue
                  </button>
                ) : (
                  <button type="button" onClick={dismissOnboarding} className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white">
                    Finish
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
