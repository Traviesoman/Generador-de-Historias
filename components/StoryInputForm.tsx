import React, { useState } from 'react';
import { StoryLength, VoiceStyle, voiceStyles } from '../types';

interface StoryInputFormProps {
  onSubmit: (idea: string, includeDialogues: boolean, length: StoryLength, narratorVoice: VoiceStyle, char1Voice: VoiceStyle, char2Voice: VoiceStyle) => void;
  isLoading: boolean;
}

const VoiceSelector: React.FC<{
    label: string;
    value: VoiceStyle;
    onChange: (value: VoiceStyle) => void;
    disabled: boolean;
    options: { id: VoiceStyle; name: string }[];
}> = ({ label, value, onChange, disabled, options }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 text-center">
            {label}
        </label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as VoiceStyle)}
            disabled={disabled}
            className="w-full px-3 py-2 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
        >
            {options.map((voice) => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
            ))}
        </select>
    </div>
);


const StoryInputForm: React.FC<StoryInputFormProps> = ({ onSubmit, isLoading }) => {
  const [idea, setIdea] = useState('');
  const [includeDialogues, setIncludeDialogues] = useState(false);
  const [length, setLength] = useState<StoryLength>('media');
  const [narratorVoice, setNarratorVoice] = useState<VoiceStyle>('Kore');
  const [char1Voice, setChar1Voice] = useState<VoiceStyle>('Zephyr');
  const [char2Voice, setChar2Voice] = useState<VoiceStyle>('Puck');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      onSubmit(idea.trim(), includeDialogues, length, narratorVoice, char1Voice, char2Voice);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            Generador de Historias con IA
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Convierte tu idea en una historia corta con una portada impresionante.
          </p>
        </div>
        <div>
          <label htmlFor="story-idea" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Escribe tu idea aquí
          </label>
          <textarea
            id="story-idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Ej: Un astronauta varado en Marte que descubre un antiguo artefacto alienígena..."
            className="w-full h-32 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isLoading}
          />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 text-center">
                Selecciona la longitud de la historia
            </label>
            <div className="flex justify-center space-x-2 rounded-lg bg-gray-200 dark:bg-gray-700 p-1">
            {(['corta', 'media', 'larga'] as StoryLength[]).map((len) => (
                <button
                key={len}
                type="button"
                onClick={() => setLength(len)}
                disabled={isLoading}
                className={`w-full px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 disabled:opacity-50 ${
                    length === len
                    ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow'
                    : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                >
                {len.charAt(0).toUpperCase() + len.slice(1)}
                </button>
            ))}
            </div>
        </div>
        
        <div className="flex justify-center items-center">
          <input
            id="include-dialogues"
            type="checkbox"
            checked={includeDialogues}
            onChange={(e) => setIncludeDialogues(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 rounded border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
          />
          <label htmlFor="include-dialogues" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            Incluir diálogos en la historia
          </label>
        </div>

        <div className={`grid grid-cols-1 ${includeDialogues ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4 items-start transition-all duration-300`}>
            <div className={`${includeDialogues ? '' : 'md:col-span-1 md:max-w-xs mx-auto w-full'}`}>
                <VoiceSelector 
                    label="Voz del Narrador"
                    value={narratorVoice}
                    onChange={setNarratorVoice}
                    disabled={isLoading}
                    options={voiceStyles}
                />
            </div>
            {includeDialogues && (
                <>
                    <VoiceSelector 
                        label="Voz Personaje 1"
                        value={char1Voice}
                        onChange={setChar1Voice}
                        disabled={isLoading}
                        options={voiceStyles}
                    />
                    <VoiceSelector 
                        label="Voz Personaje 2"
                        value={char2Voice}
                        onChange={setChar2Voice}
                        disabled={isLoading}
                        options={voiceStyles}
                    />
                </>
            )}
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isLoading || !idea.trim()}
            className="flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-indigo-600 border border-transparent rounded-md shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando...
              </>
            ) : (
              'Generar Historia y Portada'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StoryInputForm;