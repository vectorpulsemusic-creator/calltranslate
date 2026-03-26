import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold, ThinkingLevel } from "@google/genai";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { VOICE_COST_PER_MINUTE, TEXT_COST_PER_1000_CHARS, CALL_COST_PER_MINUTE } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  // Check localStorage for a user-provided key first (for local setup)
  const localKey = localStorage.getItem("calltranslate_gemini_key");
  const apiKey = localKey || process.env.GEMINI_API_KEY;
  
  if (!aiInstance) {
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
      console.warn("GEMINI_API_KEY is not defined or is placeholder. Using Mock Mode.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export async function translateText(text: string, sourceLang: string, targetLang: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const cost = Math.ceil(text.length / 1000) * TEXT_COST_PER_1000_CHARS;
  const ai = getAI();

  let translatedText = "";

  if (!ai) {
    // Mock translation for offline/no-key mode
    translatedText = `[MOCK TRANSLATION from ${sourceLang} to ${targetLang}]: ${text}`;
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate latency
  } else {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text from ${sourceLang} to ${targetLang}: "${text}"`,
      config: {
        systemInstruction: "You are a professional translator. Provide only the translated text without any explanations or extra characters. Translate EVERYTHING exactly as spoken, including vulgar language or slang. Priority: SPEED.",
        safetySettings,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    translatedText = response.text || "";
  }

  try {
    await updateDoc(doc(db, "users", user.uid), {
      credits: increment(-cost),
    });
    await addDoc(collection(db, "sessions"), {
      userId: user.uid,
      type: "text",
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      sourceText: text,
      translatedText: translatedText,
      cost: cost,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "sessions");
  }

  return translatedText;
}

export async function generateTTS(text: string, voice: string = 'Kore') {
  const ai = getAI();
  if (!ai) {
    console.warn("TTS Mock Mode: No audio generated.");
    return null;
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice as any },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Generation failed:", error);
    return null;
  }
}

export async function connectVoiceTranslation(
  sourceLang: string,
  targetLang: string,
  autoDetect: boolean,
  voice: string = "Zephyr",
  onAudioOutput: (base64Audio: string) => void,
  onTranscription: (text: string) => void
) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const ai = getAI();
  if (!ai) {
    // Mock Voice Translation
    const interval = setInterval(() => {
      onTranscription("[MOCK TRANSCRIPTION] Hello, this is a simulated translation.");
    }, 3000);
    return { close: () => clearInterval(interval), sendRealtimeInput: () => {} };
  }

  const instruction = autoDetect 
    ? `You are a real-time voice translator. Detect the spoken language and translate it to ${targetLang}. Speak IMMEDIATELY as soon as you hear speech. Provide a fast, natural, conversational translation. Speak only the translation. Translate EVERYTHING exactly, including vulgar language, insults, or slang. Speed is the absolute priority. Do not wait for long pauses. BE CONCISE.`
    : `You are a real-time voice translator. Translate speech from ${sourceLang} to ${targetLang}. Speak IMMEDIATELY as soon as you hear speech. Provide a fast, natural, conversational translation. Speak only the translation. Translate EVERYTHING exactly, including vulgar language, insults, or slang. Speed is the absolute priority. Do not wait for long pauses. BE CONCISE.`;

  const sessionPromise = ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    callbacks: {
      onmessage: async (message) => {
        if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
          onAudioOutput(message.serverContent.modelTurn.parts[0].inlineData.data);
        }
        if (message.serverContent?.modelTurn?.parts[0]?.text) {
          onTranscription(message.serverContent.modelTurn.parts[0].text);
        }
      },
      onerror: (err) => {
        console.error("Voice Live API Error:", err);
      }
    },
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: instruction,
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice as any } },
      },
    },
  });

  return sessionPromise;
}

export async function connectCallTranslation(
  sourceLang: string,
  targetLang: string,
  voice: string = "Fenrir",
  onAudioOutput: (base64Audio: string) => void,
  onTranscription: (text: string) => void
) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const ai = getAI();
  if (!ai) {
    // Mock Call Translation
    const interval = setInterval(() => {
      onTranscription("[MOCK CALL TRANSCRIPTION] Simulating a phone call translation...");
    }, 4000);
    return { close: () => clearInterval(interval), sendRealtimeInput: () => {} };
  }

  const instruction = `You are a phone call translator. Translate speech from ${sourceLang} to ${targetLang}. Speak IMMEDIATELY as soon as you hear speech. Provide a fast, natural, conversational translation. Speak only the translation. Translate EVERYTHING exactly, including vulgar language, insults, or slang. Speed is the absolute priority. Do not wait for long pauses. BE CONCISE.`;

  const sessionPromise = ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    callbacks: {
      onmessage: async (message) => {
        if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
          onAudioOutput(message.serverContent.modelTurn.parts[0].inlineData.data);
        }
        if (message.serverContent?.modelTurn?.parts[0]?.text) {
          onTranscription(message.serverContent.modelTurn.parts[0].text);
        }
      },
      onerror: (err) => {
        console.error("Call Live API Error:", err);
      }
    },
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: instruction,
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice as any } },
      },
    },
  });

  return sessionPromise;
}

export async function deductCredits(type: "voice" | "call", durationSeconds: number, sourceLang: string, targetLang: string) {
  const user = auth.currentUser;
  if (!user) return;

  const minutes = Math.ceil(durationSeconds / 60);
  const rate = type === "voice" ? VOICE_COST_PER_MINUTE : CALL_COST_PER_MINUTE;
  const cost = minutes * rate;

  try {
    await updateDoc(doc(db, "users", user.uid), {
      credits: increment(-cost),
    });
    await addDoc(collection(db, "sessions"), {
      userId: user.uid,
      type: type,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      cost: cost,
      duration: durationSeconds,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "sessions");
  }
}
