import { Character, Scene } from "./types";

export function makeScenePrompt(scene: Scene, characters: Character[]) {
  const chosen = characters.filter(c => scene.characterIds.includes(c.id));
  const identity = chosen.length
    ? chosen.map(c => `CHARACTER "${c.name}": ${c.description || "Match the supplied reference image exactly."}`).join("\n")
    : "Use only the supplied character reference images.";
  return `Create a polished cinematic 3D animated Bible-story scene.\n\nSTORY ACTION:\n${scene.story}\n\nCHARACTER REFERENCE LOCK:\n${identity}\nUse only the assigned uploaded/reference character sheets. Do not redesign, alter, replace, duplicate, merge, or invent character appearances. Preserve each character's face, skin/fur colors, hairstyle, clothing, proportions, accessories, and identity exactly as shown in the references. Do not add unassigned characters.\n\nVISUAL DIRECTION:\nHigh-quality family-friendly 3D animation, expressive but natural acting, detailed environment, cinematic lighting, clear composition, smooth motion, consistent art direction. Respect the Biblical passage; do not invent story events that contradict it.\n\nCAMERA / ACTION:\n${scene.prompt || "Medium-wide cinematic shot, gentle camera movement, readable character action."}\n\nDURATION: ${scene.duration} seconds.\nNo captions, no watermark, no logos, no extra limbs, no distorted faces.`;
}