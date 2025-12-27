
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Base64 decoding helper for raw bytes from API
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data into an AudioBuffer for playback
 */
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

export const geminiService = {
  /**
   * Translates text and optionally detects the source language.
   */
  async translate(text: string, targetLang: string, sourceLang?: string): Promise<{ translatedText: string, detectedLang?: string }> {
    const ai = getAI();
    const prompt = sourceLang === 'auto' || !sourceLang
      ? `Detect the language of the following text and translate it into "${targetLang}". Return a JSON object with "detectedLang" (ISO 639-1 code) and "translatedText". Text: "${text}"`
      : `Translate the following text from "${sourceLang}" to "${targetLang}". Return a JSON object with "translatedText". Text: "${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            detectedLang: { type: Type.STRING }
          },
          required: ['translatedText']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result;
  },

  /**
   * Translates text found within an image.
   */
  async translateImage(base64Data: string, mimeType: string, targetLang: string): Promise<{ originalText: string, translatedText: string, detectedLang: string }> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: `Extract the text from this image, detect its language, and translate it into "${targetLang}". Return a JSON object with "originalText", "translatedText", and "detectedLang" (ISO code).`
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            translatedText: { type: Type.STRING },
            detectedLang: { type: Type.STRING }
          },
          required: ['originalText', 'translatedText', 'detectedLang']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result;
  },

  /**
   * Generates high-quality speech for translated text.
   */
  async speak(text: string, lang: string): Promise<void> {
    const ai = getAI();
    const voiceMap: Record<string, string> = {
      'ja': 'Kore', 'zh': 'Kore', 'ko': 'Kore', 'hi': 'Zephyr',
      'bn': 'Zephyr', 'te': 'Zephyr', 'ta': 'Zephyr', 'ar': 'Fenrir',
      'tr': 'Fenrir', 'de': 'Puck', 'es': 'Puck', 'it': 'Puck',
      'fr': 'Kore', 'en': 'Zephyr', 'pt': 'Puck', 'ru': 'Charon', 'vi': 'Kore'
    };

    const voiceName = voiceMap[lang] || 'Zephyr';

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("No audio data received");

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const decodedData = decodeBase64(audioData);
      const audioBuffer = await decodeAudioData(decodedData, audioContext, 24000, 1);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (error) {
      console.error("Speech synthesis failed:", error);
    }
  }
};
