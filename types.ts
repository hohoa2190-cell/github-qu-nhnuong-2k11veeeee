
export interface Photo {
  id: string;
  url: string;
  caption: string;
  rotation: number;
  scale: number;
  filter?: string;
  isAIProcessing: boolean;
}

export interface StickerInstance {
  id: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  ERROR = 'ERROR'
}
