export enum MessageRole {
  USER = 'user',
  MODEL = 'model'
}

export interface ChatMessage {
  role: MessageRole;
  text: string;
  timestamp: number;
}

export enum DisplayMode {
  VECTOR = 'VECTOR',
  RASTER = 'RASTER'
}

export enum ContentMode {
  PRESET = 'PRESET',
  DRAW = 'DRAW',
  TEXT = 'TEXT'
}

export interface VectorPoint {
  x: number;
  y: number;
}

export interface VectorShape {
  id: string;
  points: VectorPoint[];
  closed: boolean;
}

export interface GeminiConfig {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
}