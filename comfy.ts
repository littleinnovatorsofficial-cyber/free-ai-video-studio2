
import { Settings } from "./types";

const cleanBase = (s: string) =>
  s.trim().replace(/\/$/, "");

export async function submitComfyJob(
  settings: Settings,
  prompt: string,
  negative = "blurry, distorted face, watermark, inconsistent character"
) {
  if (!settings.comfyUrl.trim()) {
    throw new Error("ComfyUI server URL is missing.");
  }

  if (!settings.workflowJson.trim()) {
    throw new Error("Import a ComfyUI API workflow JSON first.");
  }

  const workflow = JSON.parse(settings.workflowJson);

  // Replace prompt placeholders throughout the workflow.
  const replaceValues = (obj: any): any => {
    if (typeof obj === "string") {
      return obj
        .replaceAll("{{PROMPT}}", prompt)
        .replaceAll("{{NEGATIVE_PROMPT}}", negative);
    }

    if (Array.isArray(obj)) {
      return obj.map(replaceValues);
    }

    if (obj && typeof obj === "object") {
      Object.keys(obj).forEach(key => {
        obj[key] = replaceValues(obj[key]);
      });
    }

    return obj;
  };

  replaceValues(workflow);

  // Explicit prompt node settings override placeholders.
  if (
    settings.positivePromptNode &&
    workflow[settings.positivePromptNode]?.inputs
  ) {
    const inputs =
      workflow[settings.positivePromptNode].inputs;

    const key =
      Object.keys(inputs).find(k => typeof inputs[k] === "string");

    if (key) inputs[key] = prompt;
  }

  if (
    settings.negativePromptNode &&
    workflow[settings.negativePromptNode]?.inputs
  ) {
    const inputs =
      workflow[settings.negativePromptNode].inputs;

    const key =
      Object.keys(inputs).find(k => typeof inputs[k] === "string");

    if (key) inputs[key] = negative;
  }

  const response = await fetch(
    `${cleanBase(settings.comfyUrl)}/prompt`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: "free-ai-video-studio"
      })
    }
  );

  if (!response.ok) {
    throw new Error(`ComfyUI error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.prompt_id) {
    throw new Error("ComfyUI did not return a prompt ID.");
  }

  return data.prompt_id as string;
}

export async function getComfyHistory(
  base: string,
  promptId: string
) {
  const response = await fetch(
    `${cleanBase(base)}/history/${promptId}`
  );

  if (!response.ok) {
    throw new Error(`History error: ${response.status}`);
  }

  return await response.json();
}

// Find generated video files in ComfyUI history.
export function getComfyVideoUrl(
  base: string,
  history: any
): string | null {
  const job = Object.values(history)[0] as any;

  if (!job?.outputs) return null;

  for (const node of Object.values(job.outputs) as any[]) {
    const files = [
      ...(node.videos || []),
      ...(node.gifs || [])
    ];

    for (const file of files) {
      if (!file.filename) continue;

      const params = new URLSearchParams({
        filename: file.filename,
        subfolder: file.subfolder || "",
        type: file.type || "output"
      });

      return `${cleanBase(base)}/view?${params.toString()}`;
    }
  }

  return null;
}

// Wait for video generation to finish.
export async function waitForComfyVideo(
  base: string,
  promptId: string,
  maxWaitMs = 30 * 60 * 1000
): Promise<string> {
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const history = await getComfyHistory(base, promptId);

    const videoUrl = getComfyVideoUrl(base, history);

    if (videoUrl) return videoUrl;

    await new Promise(resolve =>
      setTimeout(resolve, 3000)
    );
  }

  throw new Error(
    "Video generation timed out. Check ComfyUI server."
  );
}

