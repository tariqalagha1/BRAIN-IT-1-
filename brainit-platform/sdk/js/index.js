export class BrainItClientError extends Error {
  constructor(message, { status = null, details = null, cause = null } = {}) {
    super(message);
    this.name = "BrainItClientError";
    this.status = status;
    this.details = details;
    if (cause) {
      this.cause = cause;
    }
  }
}

export class BrainItClient {
  constructor({ baseUrl, apiKey, timeoutMs = 15000 } = {}) {
    if (!baseUrl) {
      throw new BrainItClientError("baseUrl is required");
    }

    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey || null;
    this.timeoutMs = timeoutMs;
  }

  async runTask({ task_type, input_payload, metadata } = {}) {
    if (!task_type) {
      throw new BrainItClientError("task_type is required");
    }
    if (!input_payload || typeof input_payload !== "object") {
      throw new BrainItClientError("input_payload must be an object");
    }

    return this._request("/v1/orchestrate", {
      method: "POST",
      body: {
        task_type,
        input_payload,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  async getTask(taskId) {
    if (!taskId) {
      throw new BrainItClientError("taskId is required");
    }

    return this._request(`/v1/tasks/${encodeURIComponent(taskId)}`);
  }

  async getAgents() {
    return this._request("/v1/agents");
  }

  async waitForCompletion(taskId, { intervalMs = 1500, timeoutMs = 60000 } = {}) {
    if (!taskId) {
      throw new BrainItClientError("taskId is required");
    }

    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const task = await this.getTask(taskId);
      if (task.status === "completed" || task.status === "failed") {
        return task;
      }
      await sleep(intervalMs);
    }

    throw new BrainItClientError(
      `Timed out waiting for task ${taskId} to complete after ${timeoutMs}ms`
    );
  }

  async _request(path, { method = "GET", body } = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await parseJsonSafely(response);

      if (!response.ok) {
        const detail = extractDetail(data);
        if (response.status === 401) {
          throw new BrainItClientError(
            `Unauthorized (401). Check your API key. ${detail}`.trim(),
            { status: response.status, details: data }
          );
        }

        throw new BrainItClientError(
          `Request failed (${response.status}). ${detail}`.trim(),
          { status: response.status, details: data }
        );
      }

      return data;
    } catch (error) {
      if (error instanceof BrainItClientError) {
        throw error;
      }

      if (error?.name === "AbortError") {
        throw new BrainItClientError(
          `Request timed out after ${this.timeoutMs}ms when calling ${url}`,
          { cause: error }
        );
      }

      throw new BrainItClientError(
        `Network error while calling ${url}: ${error?.message || "Unknown error"}`,
        { cause: error }
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function extractDetail(data) {
  if (!data) {
    return "";
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return "";
}

async function parseJsonSafely(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new BrainItClientError("Response was not valid JSON", { status: response.status });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
