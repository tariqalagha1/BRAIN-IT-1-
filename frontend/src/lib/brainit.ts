"use client";

export type StoredBrainItApiKey = {
  id: string;
  plaintextKey: string;
  keyPrefix: string;
  clientName: string;
  tenantId: string;
  planType: "free" | "pro" | "enterprise";
  createdAt: string;
  source: "created" | "manual";
};

export type StoredRecentTask = {
  taskId: string;
  taskType: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
};

const ACTIVE_API_KEY_STORAGE = "brainit_active_api_key";
const RECENT_TASKS_STORAGE = "brainit_recent_tasks";
const ONBOARDING_STORAGE = "brainit_onboarding_complete";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getStoredBrainItApiKey(): StoredBrainItApiKey | null {
  return readJson<StoredBrainItApiKey | null>(ACTIVE_API_KEY_STORAGE, null);
}

export function getStoredBrainItApiKeyValue(): string {
  return getStoredBrainItApiKey()?.plaintextKey ?? "";
}

export function setStoredBrainItApiKey(value: StoredBrainItApiKey): void {
  writeJson(ACTIVE_API_KEY_STORAGE, value);
}

export function clearStoredBrainItApiKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_API_KEY_STORAGE);
}

export function getStoredRecentTasks(): StoredRecentTask[] {
  return readJson<StoredRecentTask[]>(RECENT_TASKS_STORAGE, []);
}

export function upsertStoredRecentTask(task: StoredRecentTask): void {
  const current = getStoredRecentTasks().filter((item) => item.taskId !== task.taskId);
  current.unshift(task);
  writeJson(RECENT_TASKS_STORAGE, current.slice(0, 10));
}

export function getOnboardingCompleted(): boolean {
  return readJson<boolean>(ONBOARDING_STORAGE, false);
}

export function setOnboardingCompleted(value: boolean): void {
  writeJson(ONBOARDING_STORAGE, value);
}
