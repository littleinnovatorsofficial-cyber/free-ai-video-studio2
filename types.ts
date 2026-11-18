
/**
 * FREE AI VIDEO STUDIO
 * Core data types
 * Version 2 - Character References and Video Jobs
 */

// Character reference image views
export type ReferenceView =
  | "front"
  | "side"
  | "back"
  | "expression"
  | "other";

// Character reference image
export type ReferenceImage = {
  id: string;
  uri: string;
  view?: ReferenceView;
  label?: string;
  createdAt?: number;
};

// Character library
export type Character = {
  id: string;
  name: string;
  description: string;

  // Keep existing field for compatibility
  imageUri?: string;

  // Multiple reference images
  referenceImages?: ReferenceImage[];

  // Character appearance protection
  appearanceLocked?: boolean;
  styleNotes?: string;
};

// Scene generation status
export type SceneStatus =
  | "draft"
  | "queued"
  | "generating"
  | "completed"
  | "failed";

// Individual video scene
export type Scene = {
  id: string;
  title: string;
  story: string;
  dialogue: string;
  duration: number;
  characterIds: string[];
  prompt: string;

  // New generation fields
  status?: SceneStatus;
  jobId?: string;
  videoUri?: string;
  errorMessage?: string;
  negativePrompt?: string;
  createdAt?: number;
  completedAt?: number;
};

// Video generation job
export type GenerationJobStatus =
  | "queued"
  | "submitting"
  | "generating"
  | "completed"
  | "failed"
  | "cancelled";

export type GenerationJob = {
  id: string;
  sceneId: string;
  status: GenerationJobStatus;

  promptId?: string;
  videoUri?: string;
  errorMessage?: string;

  createdAt: number;
  startedAt?: number;
  completedAt?: number;
};

// Daily generation usage
export type DailyUsage = {
  dateKey: string;
  usedCount: number;
  dailyLimit: number;
  resetAt?: number;
};

// Video quality settings
export type VideoQuality = "480p" | "720p" | "1080p";

// App settings
export type Settings = {
  // Existing ComfyUI settings
  comfyUrl: string;
  workflowJson: string;
  positivePromptNode: string;
  negativePromptNode: string;
  imageNode: string;

  // New video settings
  defaultDuration?: number;
  videoQuality?: VideoQuality;
  dailyVideoLimit?: number;
  maxConcurrentJobs?: number;

  // Optional generation settings
  videoOutputNode?: string;
  enableCharacterConsistency?: boolean;
  enableTamilVoice?: boolean;
  enableLipSync?: boolean;
};
