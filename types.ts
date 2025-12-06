
export interface RepairStep {
  step: number;
  instruction: string;
  detail: string;
}

export interface FixItResponse {
  id?: string; // Unique ID for history
  timestamp?: number; // For sorting
  imageUrl?: string; // Reference to the analyzed image
  title: string;
  problemDescription: string;
  rootCause: string;
  safetyWarnings: string[];
  toolsNeeded: string[];
  steps: RepairStep[];
  visualGuide: string; // Text-based description/markup
}

export interface MediaFile {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  base64?: string;
}

export interface DetectedItem {
  id: string;
  name: string;
  description: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADED = 'UPLOADED', // User has uploaded/pasted, waiting for confirmation
  DETECTING = 'DETECTING', // Analyzing image content
  SELECTING = 'SELECTING', // User selecting item
  ANALYZING = 'ANALYZING', // Generating repair guide
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
