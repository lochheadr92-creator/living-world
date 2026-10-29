// Observation preferences only. Never serialized with, or read by, a World.
export type SpeechMode = 'automatic' | 'selected' | 'hidden';
export interface ViewerPreferences {
  speech: SpeechMode;
  textSize: 'normal' | 'large';
  contrast: 'standard' | 'high';
  reducedMotion: boolean;
}
export interface ViewRect { x: number; y: number; w: number; h: number }
export const DEFAULT_VIEWER: ViewerPreferences = { speech: 'automatic', textSize: 'normal', contrast: 'standard', reducedMotion: false };
export function viewerPreferences(value?: Partial<ViewerPreferences> | null): ViewerPreferences {
  return {
    speech: value?.speech === 'selected' || value?.speech === 'hidden' ? value.speech : 'automatic',
    textSize: value?.textSize === 'large' ? 'large' : 'normal',
    contrast: value?.contrast === 'high' ? 'high' : 'standard',
    reducedMotion: value?.reducedMotion === true,
  };
}
export function speechVisible(mode: SpeechMode, selected: boolean): boolean {
  // Warnings obey the same setting. Hidden really hides every map speech overlay.
  return mode === 'automatic' || mode === 'selected' && selected;
}
