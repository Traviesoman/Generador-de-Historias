import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Story } from '../types';

interface StoryDisplayProps {
  story: Story;
  onReset: () => void;
}

// Audio decoding utilities
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const StoryDisplay: React.FC<StoryDisplayProps> = ({ story, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const setupAudio = async () => {
      if (!story.audioBase64) {
        setIsAudioLoading(false);
        return;
      };
      
      try {
        setIsAudioLoading(true);
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const decodedBytes = decode(story.audioBase64);
        const buffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
        audioBufferRef.current = buffer;
      } catch (error) {
        console.error("Error al decodificar el audio:", error);
      } finally {
        setIsAudioLoading(false);
      }
    };

    setupAudio();
    
    // Cleanup on component unmount
    return () => {
        sourceRef.current?.stop();
        audioContextRef.current?.close().catch(() => {});
    }
  }, [story.audioBase64]);

  const handlePlayPause = useCallback(() => {
    if (!audioBufferRef.current || !audioContextRef.current) return;

    if (isPlaying) {
      sourceRef.current?.stop();
      setIsPlaying(false);
    } else {
      if(audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      source.start();
      source.onended = () => {
        setIsPlaying(false);
      };
      sourceRef.current = source;
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleDownloadSrt = () => {
    if (!story.srtContent) return;

    const blob = new Blob([story.srtContent], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Sanitize title for filename
    const fileName = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.srt`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAudio = () => {
    if (!story.audioBase64) return;

    const pcmData = decode(story.audioBase64);
    const wavBlob = createWavBlob(pcmData);
    
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wav`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const createWavBlob = (pcmData: Uint8Array) => {
    const numChannels = 1;
    const sampleRate = 24000;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const chunkSize = 36 + dataSize;
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, chunkSize, true);
    writeString(view, 8, 'WAVE');

    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Sub-chunk size
    view.setUint16(20, 1, true); // Audio format (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    new Uint8Array(buffer, 44).set(pcmData);

    return new Blob([view], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
  };


  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-gray-800 shadow-xl dark:shadow-2xl rounded-lg overflow-hidden md:flex">
        <div className="md:w-1/3">
          <img
            src={story.coverImageUrl}
            alt={`Portada para ${story.title}`}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-6 md:p-8 md:w-2/3 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-gray-900 dark:text-white">{story.title}</h2>
            <button
                onClick={handlePlayPause}
                disabled={isAudioLoading || !audioBufferRef.current}
                className="p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-200"
                aria-label={isPlaying ? "Pausar narración" : "Reproducir narración"}
            >
                {isAudioLoading ? (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="6" width="4" height="12">
                            <animate attributeName="height" values="12;20;12" begin="0s" dur="1.2s" repeatCount="indefinite" />
                            <animate attributeName="y" values="6;2;6" begin="0s" dur="1.2s" repeatCount="indefinite" />
                        </rect>
                        <rect x="10" y="6" width="4" height="12">
                            <animate attributeName="height" values="12;20;12" begin="0.2s" dur="1.2s" repeatCount="indefinite" />
                            <animate attributeName="y" values="6;2;6" begin="0.2s" dur="1.2s" repeatCount="indefinite" />
                        </rect>
                        <rect x="16" y="6" width="4" height="12">
                            <animate attributeName="height" values="12;20;12" begin="0.4s" dur="1.2s" repeatCount="indefinite" />
                            <animate attributeName="y" values="6;2;6" begin="0.4s" dur="1.2s" repeatCount="indefinite" />
                        </rect>
                    </svg>
                ) : isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd"></path></svg>
                ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                )}
            </button>
          </div>
          <div className="overflow-y-auto max-h-[60vh] pr-4 scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-800">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-serif whitespace-pre-wrap">{story.content}</p>
          </div>
          <div className="mt-auto pt-6 flex flex-col lg:flex-row items-center justify-center gap-4">
            <button
              onClick={onReset}
              className="px-6 py-3 w-full lg:w-auto text-base font-semibold text-white bg-indigo-600 border border-transparent rounded-md shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 order-1 lg:order-3"
            >
              Crear otra historia
            </button>
            <button
                onClick={handleDownloadAudio}
                className="px-6 py-3 w-full lg:w-auto text-base font-semibold text-indigo-600 dark:text-indigo-400 bg-transparent border border-indigo-600 dark:border-indigo-400 rounded-md shadow-lg hover:bg-indigo-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 order-2 lg:order-2"
            >
                Descargar Audio (.wav)
            </button>
            <button
                onClick={handleDownloadSrt}
                className="px-6 py-3 w-full lg:w-auto text-base font-semibold text-indigo-600 dark:text-indigo-400 bg-transparent border border-indigo-600 dark:border-indigo-400 rounded-md shadow-lg hover:bg-indigo-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 order-3 lg:order-1"
            >
                Descargar Subtítulos (.srt)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryDisplay;