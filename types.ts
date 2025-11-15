export interface Story {
  title: string;
  content: string;
  coverImageUrl: string;
  audioBase64: string;
  srtContent: string;
}

export type StoryLength = 'corta' | 'media' | 'larga';

export type VoiceStyle = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export const voiceStyles: { id: VoiceStyle; name: string }[] = [
    { id: 'Zephyr', name: 'Amistoso y Cálido' },
    { id: 'Puck', name: 'Enérgico y Juvenil' },
    { id: 'Charon', name: 'Profundo y Serio' },
    { id: 'Kore', name: 'Claro y Profesional' },
    { id: 'Fenrir', name: 'Grave y Misterioso' },
];