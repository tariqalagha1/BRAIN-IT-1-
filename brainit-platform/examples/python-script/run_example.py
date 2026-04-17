from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sdk_path = Path(__file__).resolve().parents[2] / "sdk" / "python"
if str(sdk_path) not in sys.path:
    sys.path.insert(0, str(sdk_path))

from brainit_client import BrainItClient  # noqa: E402


def main() -> None:
    client = BrainItClient(
        base_url=os.getenv("BRAINIT_BASE_URL", "http://127.0.0.1:18601"),
        api_key=os.getenv("BRAINIT_API_KEY") or None,
    )

    created = client.run_task(
        task_type="echo_transform",
        input_payload={"text": "hello from python example"},
    )

    if created.get("status") in {"completed", "failed"}:
        task = client.get_task(created["task_id"])
    else:
        task = client.wait_for_completion(created["task_id"])

    print(json.dumps(task, indent=2))


if __name__ == "__main__":
    main()
