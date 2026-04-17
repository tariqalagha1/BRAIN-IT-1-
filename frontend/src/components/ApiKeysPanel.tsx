"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import {
  createApiKey,
  disableApiKey,
  getApiBaseUrl,
  listApiKeys,
  type ApiKeyCreateResponse,
  type ApiKeyMetadata,
} from "@/lib/api";

type SnippetLanguage = "javascript" | "python" | "dotenv";

type SnippetCardProps = {
  title: string;
  code: string;
  language: SnippetLanguage;
  onCopy: () => void;
  copied: boolean;
};

const SYNTAX_KEYWORDS: Record<SnippetLanguage, string[]> = {
  javascript: ["import", "const", "await", "new", "console", "log", "async", "from"],
  python: ["from", "import", "client", "result", "print"],
  dotenv: ["BRAINIT_API_KEY", "BRAINIT_BASE_URL"],
};

function maskApiKey(apiKey: string): string {
  if (!apiKey) {
    return "Unavailable";
  }
  if (apiKey.length <= 10) {
    return "*".repeat(apiKey.length);
  }
  return `${apiKey.slice(0, 6)}${"*".repeat(apiKey.length - 10)}${apiKey.slice(-4)}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedLine(line: string, language: SnippetLanguage): ReactNode[] {
  const keywords = SYNTAX_KEYWORDS[language];
  const keywordPattern = keywords.map((keyword) => escapeRegExp(keyword)).join("|");
  const tokenRegex = new RegExp(
    `(\"(?:[^\\\"\\\\]|\\\\.)*\"|'(?:[^\\'\\\\]|\\\\.)*'|\\b(?:${keywordPattern})\\b|#.*$|//.*$)`,
    "g"
  );

  return line.split(tokenRegex).map((token, idx) => {
    if (!token) {
      return <span key={`${line}-${idx}`} />;
    }

    if (token.startsWith("\"") || token.startsWith("'")) {
      return (
        <span key={`${line}-${idx}`} className="text-emerald-300">
          {token}
        </span>
      );
    }

    if (token.startsWith("#") || token.startsWith("//")) {
      return (
        <span key={`${line}-${idx}`} className="text-slate-500">
          {token}
        </span>
      );
    }

    if (keywords.includes(token)) {
      return (
        <span key={`${line}-${idx}`} className="text-cyan-300">
          {token}
        </span>
      );
    }

    return <span key={`${line}-${idx}`}>{token}</span>;
  });
}

function SnippetCard({ title, code, language, onCopy, copied }: SnippetCardProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
        >
          {copied ? "Copied!" : `Copy ${title}`}
        </button>
      </div>

      <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-200">
        {code.split("\n").map((line, idx) => (
          <div key={`${title}-${idx}`} className="whitespace-pre">
            {renderHighlightedLine(line, language)}
          </div>
        ))}
      </pre>
    </div>
  );
}

export default function ApiKeysPanel() {
  const [clientName, setClientName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [planType, setPlanType] = useState<"free" | "pro" | "enterprise">("free");
  const [usageLimitInput, setUsageLimitInput] = useState("");
  const [keys, setKeys] = useState<ApiKeyMetadata[]>([]);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateResponse | null>(null);
  const [knownSdkKeys, setKnownSdkKeys] = useState<Record<string, string>>({});
  const [selectedSdkKeyId, setSelectedSdkKeyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const apiBaseUrl = getApiBaseUrl();

  async function loadKeys() {
    try {
      setLoading(true);
      setError("");
      setKeys(await listApiKeys());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    if (!tenantId.trim()) {
      setError("Tenant ID is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await createApiKey({
        client_name: clientName.trim(),
        tenant_id: tenantId.trim(),
        plan_type: planType,
        usage_limit: usageLimitInput.trim() ? Number(usageLimitInput.trim()) : null,
      });
      setCreatedKey(response);
      setKnownSdkKeys((current) => ({ ...current, [response.id]: response.plaintext_key }));
      setSelectedSdkKeyId(response.id);
      setClientName("");
      setTenantId("");
      setPlanType("free");
      setUsageLimitInput("");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable(keyId: string) {
    try {
      setBusyKeyId(keyId);
      const updated = await disableApiKey(keyId);
      setKeys((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (!updated.is_active && selectedSdkKeyId === updated.id) {
        setSelectedSdkKeyId("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable API key");
    } finally {
      setBusyKeyId(null);
    }
  }

  async function copyToClipboard(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 1400);
    } catch {
      setError("Failed to copy. Please copy manually.");
    }
  }

  useEffect(() => {
    void loadKeys();
  }, []);

  const activeKeys = useMemo(() => keys.filter((key) => key.is_active), [keys]);

  useEffect(() => {
    if (activeKeys.length === 0) {
      setSelectedSdkKeyId("");
      return;
    }

    const selectedStillActive = activeKeys.some((key) => key.id === selectedSdkKeyId);
    if (selectedStillActive) {
      return;
    }

    const firstKnown = activeKeys.find((key) => Boolean(knownSdkKeys[key.id]));
    setSelectedSdkKeyId(firstKnown?.id ?? activeKeys[0].id);
  }, [activeKeys, knownSdkKeys, selectedSdkKeyId]);

  const selectedKeyMetadata = activeKeys.find((key) => key.id === selectedSdkKeyId) ?? null;
  const selectedKeyValue = selectedKeyMetadata ? knownSdkKeys[selectedKeyMetadata.id] ?? "" : "";
  const injectedApiKey = selectedKeyValue || "YOUR_API_KEY";

  const jsSnippet = `import { BrainItClient } from "../sdk/js/index.js";

const client = new BrainItClient({
  baseUrl: "${apiBaseUrl}",
  apiKey: "${injectedApiKey}"
});

const result = await client.runTask({
  task_type: "echo_transform",
  input_payload: { text: "hello" }
});

console.log(result);`;

  const pythonSnippet = `from brainit_client import BrainItClient

client = BrainItClient(
    base_url="${apiBaseUrl}",
    api_key="${injectedApiKey}"
)

result = client.run_task(
    task_type="echo_transform",
    input_payload={"text": "hello"}
)

print(result)`;

  const envSnippet = `BRAINIT_API_KEY=${injectedApiKey}
BRAINIT_BASE_URL=${apiBaseUrl}`;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
      <div>
        <h2 className="text-lg font-semibold text-white">API Keys</h2>
        <p className="mt-1 text-sm text-slate-400">Create and manage platform access keys for external clients.</p>
      </div>

      <form onSubmit={handleCreate} className="mt-4 space-y-4 rounded-lg border border-slate-700 bg-slate-950/60 p-4">
        <div>
          <label className="mb-2 block text-sm text-slate-300" htmlFor="api-client-name">
            Client Name
          </label>
          <input
            id="api-client-name"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-500/70 transition focus:ring"
            placeholder="SDK Client"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300" htmlFor="api-tenant-id">
            Tenant ID
          </label>
          <input
            id="api-tenant-id"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-500/70 transition focus:ring"
            placeholder="tenant-acme"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-slate-300" htmlFor="api-plan-type">
              Plan Type
            </label>
            <select
              id="api-plan-type"
              value={planType}
              onChange={(event) => setPlanType(event.target.value as "free" | "pro" | "enterprise")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-500/70 transition focus:ring"
            >
              <option value="free">free</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300" htmlFor="api-usage-limit">
              Usage Limit Override (daily)
            </label>
            <input
              id="api-usage-limit"
              value={usageLimitInput}
              onChange={(event) => setUsageLimitInput(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-500/70 transition focus:ring"
              placeholder="leave empty for plan default"
              inputMode="numeric"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-800"
        >
          {submitting ? "Creating..." : "Create API Key"}
        </button>
      </form>

      {createdKey ? (
        <div className="mt-4 rounded-lg border border-amber-700/50 bg-amber-950/20 p-4">
          <p className="text-sm font-semibold text-amber-300">Plaintext Key</p>
          <p className="mt-2 text-xs text-slate-300">Copy this now. It will not be shown again.</p>
          <p className="mt-3 break-all rounded-lg bg-slate-950 p-3 font-mono text-sm text-cyan-200">{createdKey.plaintext_key}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-4">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white">SDK Configuration</h3>
          <p className="mt-1 text-sm text-slate-400">
            Copy-ready configuration that connects dashboard API keys to SDK usage with no manual setup.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Base URL</label>
            <input
              value={apiBaseUrl}
              readOnly
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">API Key Source</label>
            <select
              value={selectedSdkKeyId}
              onChange={(event) => setSelectedSdkKeyId(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500/70 transition focus:ring"
            >
              {activeKeys.length === 0 ? <option value="">No active keys</option> : null}
              {activeKeys.map((key) => {
                const hasPlaintext = Boolean(knownSdkKeys[key.id]);
                return (
                  <option key={key.id} value={key.id}>
                    {key.client_name} ({key.key_prefix}){hasPlaintext ? "" : " - create/select a new key for auto-injection"}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Selected API Key</p>
          <p className="mt-2 break-all font-mono text-sm text-cyan-200">{maskApiKey(injectedApiKey)}</p>
          {!selectedKeyValue ? (
            <p className="mt-2 text-xs text-amber-300">
              Plaintext value is only available for keys created in this dashboard session. Snippets currently use a placeholder.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!selectedKeyValue}
            onClick={() => void copyToClipboard(selectedKeyValue, "api-key")}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copiedId === "api-key" ? "Copied!" : "Copy API Key"}
          </button>
          <button
            type="button"
            onClick={() => void copyToClipboard(jsSnippet, "js")}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            {copiedId === "js" ? "Copied!" : "Copy JS Example"}
          </button>
          <button
            type="button"
            onClick={() => void copyToClipboard(pythonSnippet, "python")}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            {copiedId === "python" ? "Copied!" : "Copy Python Example"}
          </button>
          <button
            type="button"
            onClick={() => void copyToClipboard(envSnippet, "env")}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            {copiedId === "env" ? "Copied!" : "Copy .env Snippet"}
          </button>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <SnippetCard
            title="JS Example"
            code={jsSnippet}
            language="javascript"
            onCopy={() => void copyToClipboard(jsSnippet, "js-inline")}
            copied={copiedId === "js-inline"}
          />
          <SnippetCard
            title="Python Example"
            code={pythonSnippet}
            language="python"
            onCopy={() => void copyToClipboard(pythonSnippet, "python-inline")}
            copied={copiedId === "python-inline"}
          />
        </div>

        <div className="mt-4">
          <SnippetCard
            title=".env Snippet"
            code={envSnippet}
            language="dotenv"
            onCopy={() => void copyToClipboard(envSnippet, "env-inline")}
            copied={copiedId === "env-inline"}
          />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-300">Loading API keys...</p> : null}

      <div className="mt-4 space-y-3">
        {keys.map((key) => (
          <article key={key.id} className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-cyan-300">{key.client_name}</p>
                <p className="text-xs text-slate-400">prefix: {key.key_prefix}</p>
                <p className="text-xs text-slate-500">tenant: {key.tenant_id}</p>
                <p className="text-xs text-slate-500">plan: {key.plan_type}</p>
                <p className="text-xs text-slate-500">limit override: {key.usage_limit ?? "none"}</p>
              </div>
              <button
                type="button"
                disabled={!key.is_active || busyKeyId === key.id}
                onClick={() => void handleDisable(key.id)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyKeyId === key.id ? "Working..." : key.is_active ? "Disable" : "Inactive"}
              </button>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
              <p>created: {key.created_at}</p>
              <p>last used: {key.last_used_at ?? "Never"}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
