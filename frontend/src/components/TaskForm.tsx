"use client";

import { FormEvent, useState } from "react";

import { createTask, type OrchestrateResponse, type TaskType } from "@/lib/api";

type TaskFormProps = {
  onTaskCreated: (task: OrchestrateResponse) => void;
};

const taskTypes: TaskType[] = ["echo", "transform", "echo_transform"];

export default function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [taskType, setTaskType] = useState<TaskType>("echo");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!text.trim()) {
      setError("Input text is required.");
      return;
    }

    try {
      setLoading(true);
      const result = await createTask({
        task_type: taskType,
        input_payload: { text: text.trim() }
      });
      onTaskCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/40">
      <h2 className="text-lg font-semibold text-white">Task Creator</h2>
      <p className="mt-1 text-sm text-slate-400">Create a new task and trigger orchestration.</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-slate-300" htmlFor="task-type">
            Task Type
          </label>
          <select
            id="task-type"
            value={taskType}
            onChange={(event) => setTaskType(event.target.value as TaskType)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-500/70 transition focus:ring"
          >
            {taskTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300" htmlFor="task-input">
            Input Text
          </label>
          <input
            id="task-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type task input text"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-500/70 transition focus:ring"
          />
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-800"
        >
          {loading ? "Running..." : "Run Task"}
        </button>
      </form>
    </section>
  );
}
