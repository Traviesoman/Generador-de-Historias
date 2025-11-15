import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Story, StoryLength, VoiceStyle } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateStoryAndCover = async (
    idea: string, 
    includeDialogues: boolean, 
    length: StoryLength,
    narratorVoice: VoiceStyle,
    char1Voice: VoiceStyle,
    char2Voice: VoiceStyle
): Promise<Story> => {
  try {
    const lengthInstructions = {
        corta: "una historia breve de unos 3 párrafos.",
        media: "una historia de longitud media, con unos 5 párrafos bien desarrollados.",
        larga: "una historia extensa y detallada de al menos 8 párrafos, explorando la trama y los personajes en profundidad."
      };

    // Step 1: Generate Story and Title based on user preferences
    let storyPrompt: string;
    if (includeDialogues) {
      storyPrompt = `Basado en la siguiente idea, crea un título atractivo y ${lengthInstructions[length]}
      La historia debe incluir diálogos entre dos personajes principales.
      Formatea la historia de la siguiente manera, etiquetando claramente cada parte:
      - Usa "Narrador:" para las partes descriptivas.
      - Usa "Personaje 1:" para el diálogo del primer personaje.
      - Usa "Personaje 2:" para el diálogo del segundo personaje.
      Asegúrate de que cada línea de diálogo y narración comience con su etiqueta correspondiente en una nueva línea, y añade un salto de línea extra entre cada bloque de texto para mejorar la legibilidad.
      Idea: "${idea}"`;
    } else {
      storyPrompt = `Basado en la siguiente idea, crea un título atractivo y ${lengthInstructions[length]} La historia debe ser principalmente descriptiva y narrativa, sin diálogos. Añade saltos de línea extra entre párrafos para mejorar la legibilidad. La idea es: "${idea}".`;
    }

    const storyGenerationPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: storyPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: 'El título de la historia.'
                    },
                    story: {
                        type: Type.STRING,
                        description: 'El contenido de la historia, formateado con etiquetas si se solicitan diálogos.'
                    }
                },
                required: ['title', 'story']
            }
        }
    });

    // Step 2: Generate Cover Image in parallel
    const imagePrompt = `Crea una portada de libro cinematográfica, de alta definición y fotorrealista para una historia sobre: "${idea}". Sin texto en la imagen. Estilo épico y dramático.`;
    const imageGenerationPromise = ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: imagePrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '3:4',
        },
    });

    // Await both initial promises
    const [storyResponse, imageResponse] = await Promise.all([storyGenerationPromise, imageGenerationPromise]);

    // Process story response
    const storyResult = JSON.parse(storyResponse.text);
    const title = storyResult.title;
    const contentForTTS = storyResult.story;
    
    if (!title || !contentForTTS) {
        throw new Error("La API no pudo generar un título o una historia.");
    }

    // Process image response
    const base64ImageBytes = imageResponse.generatedImages[0]?.image.bytes;
    if (!base64ImageBytes) {
        throw new Error("La API no pudo generar una imagen de portada.");
    }
    const coverImageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

    // Step 3: Generate Audio and Subtitles in parallel
    let speechConfig;
    if (includeDialogues) {
        speechConfig = {
            multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                    {
                        speaker: 'Narrador',
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: narratorVoice } }
                    },
                    {
                        speaker: 'Personaje 1',
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: char1Voice } }
                    },
                    {
                        speaker: 'Personaje 2',
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: char2Voice } }
                    }
                ]
            }
        };
    } else {
        speechConfig = {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: narratorVoice },
            },
        };
    }

    const audioGenerationPromise = ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: contentForTTS }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: speechConfig,
        },
    });

    const srtPrompt = `Convierte el siguiente texto de una historia en un formato de subtítulos SRT (SubRip). Estima las marcas de tiempo para una velocidad de lectura natural. Asegúrate de que el formato sea correcto, con números de secuencia, marcas de tiempo (HH:MM:SS,msl --> HH:MM:SS,msl) y el texto. El texto es:\n\n"${contentForTTS}"`;
    const srtGenerationPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: srtPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    srt: {
                        type: Type.STRING,
                        description: 'El contenido completo del archivo de subtítulos en formato SRT.'
                    }
                },
                required: ['srt']
            }
        }
    });
    
    const [audioResponse, srtResponse] = await Promise.all([audioGenerationPromise, srtGenerationPromise]);

    const audioBase64 = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
        throw new Error("La API no pudo generar la narración de audio.");
    }

    const srtResult = JSON.parse(srtResponse.text);
    const srtContent = srtResult.srt;
    if (!srtContent) {
        throw new Error("La API no pudo generar los subtítulos.");
    }

    const displayContent = contentForTTS;

    return { title, content: displayContent, coverImageUrl, audioBase64, srtContent };

  } catch (error) {
    console.error("Error al generar la historia, portada y audio:", error);
    if (error instanceof Error) {
        throw new Error(`Error en la API de Gemini: ${error.message}`);
    }
    throw new Error("Ocurrió un error desconocido al contactar la API de Gemini.");
  }
};