export type Character = {
  id: string; name: string; description: string; imageUri?: string;
};
export type Scene = {
  id: string; title: string; story: string; dialogue: string;
  duration: number; characterIds: string[]; prompt: string;
};
export type Settings = {
  comfyUrl: string; workflowJson: string; positivePromptNode: string;
  negativePromptNode: string; imageNode: string;
};