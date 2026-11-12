import { Settings } from "./types";

/**
 * Generic ComfyUI API adapter.
 * Import a workflow JSON exported from ComfyUI in API format.
 * Put {{PROMPT}}, {{NEGATIVE_PROMPT}}, and optionally {{IMAGE_FILENAME}} in node inputs.
 * Node IDs are configured in Settings. Image upload is optional.
 */
const cleanBase = (s: string) => s.trim().replace(/\/+$/, "");

export async function submitComfyJob(
  settings: Settings, prompt: string, negative = "blurry, distorted face, watermark"
) {
  if (!settings.comfyUrl.trim()) throw new Error("ComfyUI server URL is missing.");
  if (!settings.workflowJson.trim()) throw new Error("Import a ComfyUI API workflow JSON first.");
  const workflow: any = JSON.parse(settings.workflowJson);
  if (settings.positivePromptNode && workflow[settings.positivePromptNode]?.inputs) {
    const inputs = workflow[settings.positivePromptNode].inputs;
    const key = Object.keys(inputs).find(k => typeof inputs[k] === "string") || "text";
    inputs[key] = prompt;
  } else {
    const raw = JSON.stringify(workflow).replaceAll("{{PROMPT}}", prompt)
      .replaceAll("{{NEGATIVE_PROMPT}}", negative);
    Object.assign(workflow, JSON.parse(raw));
  }
  if (settings.negativePromptNode && workflow[settings.negativePromptNode]?.inputs) {
    const inputs = workflow[settings.negativePromptNode].inputs;
    const key = Object.keys(inputs).find(k => typeof inputs[k] === "string") || "text";
    inputs[key] = negative;
  }
  const res = await fetch(`${cleanBase(settings.comfyUrl)}/prompt`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: "free-ai-video-studio" })
  });
  if (!res.ok) throw new Error(`ComfyUI rejected the job (${res.status}). Check URL, workflow and CORS.`);
  const data = await res.json();
  if (!data.prompt_id) throw new Error("No prompt_id returned by ComfyUI.");
  return data.prompt_id as string;
}

export async function getComfyHistory(base: string, promptId: string) {
  const res = await fetch(`${cleanBase(base)}/history/${promptId}`);
  if (!res.ok) throw new Error(`History request failed (${res.status}).`);
  return await res.json();
}