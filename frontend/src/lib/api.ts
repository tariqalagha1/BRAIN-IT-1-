import { getToken } from "@/lib/auth";
import { getStoredBrainItApiKeyValue } from "@/lib/brainit";

export type TaskType = "echo" | "transform" | "echo_transform";

export type ExecutionStep = {
  agent?: string;
  service?: string;
  status?: string;
  [key: string]: unknown;
};

export type A2ACall = {
  from?: string;
  to?: string;
  agent?: string;
  [key: string]: unknown;
};

export type OrchestrateRequest = {
  task_type: TaskType;
  input_payload: {
    text: string;
  };
  metadata?: Record<string, unknown>;
};

export type OrchestrateResponse = {
  task_id: string;
  status: "pending" | "running" | "completed" | "failed";
  agent_used: string | null;
  output_payload: Record<string, unknown> | null;
  execution_steps: ExecutionStep[] | null;
  a2a_calls: A2ACall[] | null;
  error_message: string | null;
};

export type TaskDetail = {
  task_id: string;
  tenant_id: string | null;
  client_name: string | null;
  created_by_api_key_id: string | null;
  task_type: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  execution_steps: ExecutionStep[] | null;
  a2a_calls: A2ACall[] | null;
  registry_snapshot: Record<string, unknown> | null;
  status: "pending" | "running" | "completed" | "failed";
  agent_used: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type RegisteredAgent = {
  id?: string;
  name: string;
  description: string;
  version: string;
  base_url: string;
  card_url: string;
  run_url: string;
  supported_task_types: string[];
  health_url: string;
  status: string;
  downstream_agents?: string[] | null;
  is_enabled?: boolean;
  last_health_check_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RegistryManagedAgent = {
  id: string;
  name: string;
  description: string;
  version: string;
  base_url: string;
  card_url: string;
  run_url: string;
  health_url: string;
  supported_task_types: string[];
  downstream_agents: string[] | null;
  status: string;
  is_enabled: boolean;
  last_health_check_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiKeyCreateRequest = {
  client_name: string;
  tenant_id: string;
  plan_type: "free" | "pro" | "enterprise";
  usage_limit?: number | null;
};

export type ApiKeyCreateResponse = {
  id: string;
  key_prefix: string;
  plaintext_key: string;
  client_name: string;
  tenant_id: string;
  plan_type: "free" | "pro" | "enterprise";
  usage_limit: number | null;
  is_active: boolean;
  created_at: string;
};

export type ApiKeyMetadata = {
  id: string;
  key_prefix: string;
  client_name: string;
  tenant_id: string;
  plan_type: "free" | "pro" | "enterprise";
  usage_limit: number | null;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
};

export type UsageSummary = {
  total_tasks: number;
  tasks_today: number;
  success_count: number;
  failure_count: number;
};

export type UsageLimits = {
  plan_type: "free" | "pro" | "enterprise";
  daily_limit: number | null;
  usage_limit_override: number | null;
  used_today: number;
  remaining_quota: number | null;
};

export type EchoAgentResponse = {
  output: Record<string, unknown>;
  execution_steps: ExecutionStep[];
  a2a_calls: A2ACall[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

type ApiOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  auth?: boolean | "api-key" | "bearer";
  apiKey?: string;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (options.auth === true || options.auth === "bearer") {
    const token = getToken();
    if (!token) {
      throw new Error("Missing session token. Sign in and try again.");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.auth === "api-key") {
    const apiKey = options.apiKey ?? getStoredBrainItApiKeyValue();
    if (!apiKey) {
      throw new Error("Create or connect an API key first.");
    }
    headers["X-API-Key"] = apiKey;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    });
  } catch {
    throw new Error(`Cannot reach API server at ${API_BASE_URL}. Make sure Brain it Core is running.`);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { detail?: string | { message?: string } }
      | null;
    const detail = payload?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message ?? `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function createTask(payload: OrchestrateRequest): Promise<OrchestrateResponse> {
  return apiRequest<OrchestrateResponse>("/v1/orchestrate", {
    method: "POST",
    body: payload
  });
}

export function getTaskById(taskId: string): Promise<TaskDetail> {
  return apiRequest<TaskDetail>(`/v1/tasks/${taskId}`);
}

export function listAgents(): Promise<RegisteredAgent[]> {
  return apiRequest<RegisteredAgent[]>("/v1/agents");
}

export function listRegistryAgents(): Promise<RegistryManagedAgent[]> {
  return apiRequest<RegistryManagedAgent[]>("/v1/registry/agents");
}

export function enableRegistryAgent(agentId: string): Promise<RegistryManagedAgent> {
  return apiRequest<RegistryManagedAgent>(`/v1/registry/agents/${agentId}/enable`, {
    method: "POST"
  });
}

export function disableRegistryAgent(agentId: string): Promise<RegistryManagedAgent> {
  return apiRequest<RegistryManagedAgent>(`/v1/registry/agents/${agentId}/disable`, {
    method: "POST"
  });
}

export function healthCheckRegistryAgent(agentId: string): Promise<RegistryManagedAgent> {
  return apiRequest<RegistryManagedAgent>(`/v1/registry/agents/${agentId}/health-check`, {
    method: "POST"
  });
}

export function createApiKey(payload: ApiKeyCreateRequest): Promise<ApiKeyCreateResponse> {
  return apiRequest<ApiKeyCreateResponse>("/v1/api-keys", {
    method: "POST",
    body: payload
  });
}

export function listApiKeys(): Promise<ApiKeyMetadata[]> {
  return apiRequest<ApiKeyMetadata[]>("/v1/api-keys");
}

export function disableApiKey(keyId: string): Promise<ApiKeyMetadata> {
  return apiRequest<ApiKeyMetadata>(`/v1/api-keys/${keyId}/disable`, {
    method: "POST"
  });
}

export function runEchoAgent(text: string): Promise<EchoAgentResponse> {
  return apiRequest<EchoAgentResponse>("/a2a/agents/echo/run", {
    method: "POST",
    body: { text }
  });
}

export function getUsageSummary(): Promise<UsageSummary> {
  return apiRequest<UsageSummary>("/v1/usage", { auth: "api-key" });
}

export function getUsageLimits(): Promise<UsageLimits> {
  return apiRequest<UsageLimits>("/v1/usage/limits", { auth: "api-key" });
}
