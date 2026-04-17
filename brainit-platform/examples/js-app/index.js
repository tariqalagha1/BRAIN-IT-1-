import { BrainItClient } from "../../sdk/js/index.js";

async function main() {
  const client = new BrainItClient({
    baseUrl: process.env.BRAINIT_BASE_URL || "http://127.0.0.1:18601",
    apiKey: process.env.BRAINIT_API_KEY || undefined,
  });

  const created = await client.runTask({
    task_type: "echo_transform",
    input_payload: { text: "hello from js example" },
  });

  const task =
    created.status === "completed" || created.status === "failed"
      ? await client.getTask(created.task_id)
      : await client.waitForCompletion(created.task_id);

  console.log("status:", task.status);
  console.log("execution_steps:", JSON.stringify(task.execution_steps, null, 2));
  console.log("final_output:", JSON.stringify(task.output_payload, null, 2));
}

main().catch((error) => {
  console.error("Example failed:", error.message);
  process.exitCode = 1;
});
