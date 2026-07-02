import { useState, useEffect, useRef, useMemo } from "react";
import logoVerbora from "./Logo_Verbora_sin_fondo.png";
import iconoVerbora from "./Icono_Verbora.png";
import letrasVerbora from "./Letras_Verbora_sin_fondo_2.png";
import { VERB_EXERCISES } from "./data";
import { TenseSentence, UserStats, PronunciationResult, VerbExercise } from "./types";
import { StatsDashboard } from "./components/StatsDashboard";
import { PronunciationDetails } from "./components/PronunciationDetails";
import { VerbSelector } from "./components/VerbSelector";
import { TenseVisualGuide } from "./components/TenseVisualGuide";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  Flame,
  Star,
  Settings,
  X,
  Key,
  Check,
  Sparkles,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Safe reference to HTML5 Speech Recognition
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// --- Grammatical Translation Helpers ---
function convertEnglishToI(sentence: string, tenseId: string, verbEN: string): string {
  const baseVerb = verbEN.replace(/^(to)\s+/i, "").trim().toLowerCase();
  
  if (tenseId === "simple-present") {
    if (/^(he|she|it)\s+/i.test(sentence)) {
      return `I ${baseVerb}`;
    }
    return sentence.replace(/^(you|we|they|he|she|it)/i, "I");
  }
  
  if (tenseId === "present-continuous") {
    return sentence.replace(/^(you|we|they|he|she|it)\s+(are|is)/i, "I am");
  }
  
  if (tenseId === "past-continuous") {
    return sentence.replace(/^(you|we|they|he|she|it)\s+(was|were)/i, "I was");
  }
  
  if (tenseId === "present-perfect" || tenseId === "present-perfect-continuous") {
    return sentence.replace(/^(you|we|they|he|she|it)\s+(have|has)/i, "I have");
  }
  
  return sentence.replace(/^(you|we|they|he|she|it)/i, "I");
}

function getSpanishFutureYo(verbES: string): string {
  const v = verbES.toLowerCase().replace(/^(a|to)\s+/i, "").trim();
  if (v === "ir") return "iré";
  if (v === "hacer") return "haré";
  if (v === "decir") return "diré";
  if (v === "tener") return "tendré";
  if (v === "querer") return "querré";
  if (v === "poder") return "podré";
  if (v === "saber") return "sabré";
  if (v === "poner") return "pondré";
  if (v === "salir") return "saldré";
  if (v === "venir") return "vendré";
  return v + "é";
}

function getSpanishPresentYo(verbES: string): string {
  const v = verbES.toLowerCase().replace(/^(a|to)\s+/i, "").trim();
  if (v === "ir") return "voy";
  if (v === "ser") return "soy";
  if (v === "estar") return "estoy";
  if (v === "dar") return "doy";
  if (v === "saber") return "sé";
  if (v === "hacer") return "hago";
  if (v === "decir") return "digo";
  if (v === "tener") return "tengo";
  if (v === "poner") return "pongo";
  if (v === "salir") return "salgo";
  if (v === "traer") return "traigo";
  if (v === "venir") return "vengo";
  
  const root = v.replace(/(ar|er|ir)$/i, "");
  return root + "o";
}

function getSpanishPastYo(verbES: string): string {
  const v = verbES.toLowerCase().replace(/^(a|to)\s+/i, "").trim();
  if (v === "ir" || v === "ser") return "fui";
  if (v === "hacer") return "hice";
  if (v === "decir") return "dije";
  if (v === "tener") return "tuve";
  if (v === "poder") return "pude";
  if (v === "poner") return "puse";
  if (v === "saber") return "supe";
  if (v === "querer") return "quise";
  if (v === "venir") return "vine";
  if (v === "estar") return "estuve";
  if (v === "dar") return "di";
  if (v === "ver") return "vi";
  
  const root = v.replace(/(ar|er|ir)$/i, "");
  if (v.endsWith("ar")) {
    return root + "é";
  }
  return root + "í";
}

function convertSpanishToYo(translation: string, tenseId: string, verbES: string): string {
  if (tenseId === "simple-present") {
    return `Yo ${getSpanishPresentYo(verbES)}`;
  }
  if (tenseId === "simple-past") {
    const past = getSpanishPastYo(verbES);
    if (verbES.toLowerCase().replace(/^(a|to)\s+/i, "").trim() === "ir") {
      return "Yo fui / Yo iba";
    }
    return `Yo ${past}`;
  }
  if (tenseId === "simple-future") {
    return `Yo ${getSpanishFutureYo(verbES)}`;
  }
  
  let t = translation;
  t = t.replace(/^(tú\s+estás|nosotros\s+estamos|ella\s+está|él\s+está|ellos\s+están|ellas\s+están)\s+/i, "Yo estoy ");
  t = t.replace(/^(tú\s+estabas|nosotros\s+estábamos|ella\s+estaba|él\s+estaba|ellos\s+estaban|ellas\s+estaban)\s+/i, "Yo estaba ");
  t = t.replace(/^(tú\s+has|nosotros\s+hemos|ella\s+ha|él\s+ha|ellos\s+han|ellas\s+han)\s+/i, "Yo he ");
  t = t.replace(/^(tú\s+habías|nosotros\s+habíamos|ella\s+había|él\s+había|ellos\s+habían|ellas\s+habían)\s+/i, "Yo había ");
  t = t.replace(/^(tú\s+estarás|nosotros\s+estaremos|ella\s+estará|él\s+estará|ellos\s+estarán|ellas\s+estarán)\s+/i, "Yo estaré ");
  t = t.replace(/^(tú\s+habrás|nosotros\s+habremos|ella\s+habrá|él\s+habrá|ellos\s+habrán|ellas\s+habrán)\s+/i, "Yo habré ");
  
  return t;
}

function convertTipToI(tip: string, tenseId: string): string {
  let t = tip;
  t = t.replace(/\btú\b/ig, "yo");
  t = t.replace(/\bella\b/ig, "yo");
  t = t.replace(/\bnosotros\b/ig, "yo");
  t = t.replace(/\bellos\b/ig, "yo");
  t = t.replace(/\bél\b/ig, "yo");

  t = t.replace(/'are'/g, "'am'");
  t = t.replace(/'were'/g, "'was'");
  t = t.replace(/'has'/g, "'have'");
  
  t = t.replace(/\/juː\s+/g, "/aɪ /");
  t = t.replace(/\/jʊ\s+r\s+/g, "/aɪ æm /");
  t = t.replace(/\/ʃiː\s+/g, "/aɪ /");
  t = t.replace(/\/ðeɪ\s+/g, "/aɪ /");
  t = t.replace(/\/wiː\s+/g, "/aɪ /");
  t = t.replace(/\/wɜːr\s+/g, "/wəz /");
  t = t.replace(/\/ɪz\s+/g, "/æm /");
  t = t.replace(/\/hæz\s+/g, "/hæv /");

  return t;
}

const slideVariants = {
  enter: (direction: 'up' | 'down') => ({
    y: direction === 'up' ? 80 : -80,
    opacity: 0,
    scale: 0.98
  }),
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      y: { type: 'spring', stiffness: 280, damping: 26 },
      opacity: { duration: 0.2 },
      scale: { duration: 0.2 }
    }
  },
  exit: (direction: 'up' | 'down') => ({
    y: direction === 'up' ? -80 : 80,
    opacity: 0,
    scale: 0.98,
    transition: {
      y: { type: 'spring', stiffness: 280, damping: 26 },
      opacity: { duration: 0.15 },
      scale: { duration: 0.15 }
    }
  })
};

export default function App() {
  // --- States ---
  const [exercises, setExercises] = useState<VerbExercise[]>(() => {
    const saved = localStorage.getItem("tense_coach_exercises");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as VerbExercise[];
        // Upgrade/healing logic: If a predefined verb is found, and it has fewer than 12 sentences,
        // we automatically replace it with the complete 12-tense version from VERB_EXERCISES.
        // We also ensure all default verbs from VERB_EXERCISES exist in the list.
        const upgraded = parsed.map((item) => {
          const freshDefault = VERB_EXERCISES.find((v) => v.id === item.id);
          if (freshDefault) {
            if (!item.sentences || item.sentences.length < 12) {
              return freshDefault;
            }
          }
          return item;
        });

        // Ensure that any missing default verb is also added back
        VERB_EXERCISES.forEach((defVerb) => {
          if (!upgraded.some((v) => v.id === defVerb.id)) {
            upgraded.push(defVerb);
          }
        });

        return upgraded;
      } catch (e) {
        console.error("Error loading exercises, using defaults:", e);
      }
    }
    return VERB_EXERCISES;
  });

  const [selectedVerbId, setSelectedVerbId] = useState<string>("work");
  const [currentTenseIndex, setCurrentTenseIndex] = useState<number>(0);
  
  // User Stats loaded from LocalStorage
  const [stats, setStats] = useState<UserStats>({
    streak: 12, // Starting mockup streak
    xp: 1250,   // Starting mockup XP
    totalAttempts: 25,
    successfulAttempts: 21,
  });

  // Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(false);
  const [welcomeInputText, setWelcomeInputText] = useState<string>("");
  const [welcomeIsGenerating, setWelcomeIsGenerating] = useState<boolean>(false);
  const [welcomeError, setWelcomeError] = useState<string>("");
  const [slideDirection, setSlideDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      setShowWelcomeScreen(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // State for recording and Speech Recognition
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [finalTranscript, setFinalTranscript] = useState<string>("");
  const [micError, setMicError] = useState<string | null>(null);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState<boolean>(true);

  // States for AI Grading
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<PronunciationResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Manual typing for fallback
  const [manualSpokenText, setManualSpokenText] = useState<string>("");
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  // --- Voice & Speed Settings states ---
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [ttsWarning, setTtsWarning] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>(() => localStorage.getItem("geminiApiKey") || "");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [highlightApiKey, setHighlightApiKey] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>("");

  useEffect(() => {
    if (isApiKeyModalOpen) {
      setTempApiKey(userApiKey);
    }
  }, [isApiKeyModalOpen, userApiKey]);

  const saveApiKey = (key: string) => {
    const trimmedKey = key.trim();
    setUserApiKey(trimmedKey);
    localStorage.setItem("geminiApiKey", trimmedKey);
    setIsApiKeyModalOpen(false);
  };
  const [useAllSubjects, setUseAllSubjects] = useState<boolean>(() => {
    const saved = localStorage.getItem("use_all_subjects");
    return saved !== "false"; // Default to true
  });
  const [autoplayTts, setAutoplayTts] = useState<boolean>(() => {
    const saved = localStorage.getItem("autoplay_tts");
    return saved !== "false"; // Default to true
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem("tts_voice_name") || "gemini-kore";
  });
  const [isGeminiQuotaExhausted, setIsGeminiQuotaExhausted] = useState<boolean>(() => {
    try {
      const savedDate = localStorage.getItem("gemini_tts_quota_exhausted_date");
      if (savedDate) {
        const todayStr = new Date().toISOString().split("T")[0];
        return savedDate === todayStr;
      }
    } catch (e) {}
    return false;
  });

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    if (voiceName.startsWith("gemini-")) {
      setIsGeminiQuotaExhausted(false);
      try {
        localStorage.removeItem("gemini_tts_quota_exhausted_date");
      } catch (e) {}
    }
  };

  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    const saved = localStorage.getItem("tts_playback_rate");
    return saved ? parseFloat(saved) : 0.85;
  });

  useEffect(() => {
    localStorage.setItem("use_all_subjects", useAllSubjects.toString());
  }, [useAllSubjects]);

  useEffect(() => {
    localStorage.setItem("autoplay_tts", autoplayTts.toString());
  }, [autoplayTts]);

  // Load available English voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const getVoiceScore = (voice: SpeechSynthesisVoice) => {
        let score = 0;
        const name = voice.name.toLowerCase();
        
        // High quality / Natural / Neural accents
        if (name.includes("natural")) score += 100;
        if (name.includes("google")) score += 80;
        if (name.includes("microsoft") && name.includes("online")) score += 90;
        if (name.includes("premium")) score += 70;
        if (name.includes("samantha")) score += 60;
        if (name.includes("daniel")) score += 50;
        if (name.includes("karen")) score += 40;
        
        // Prefer US / GB English for standard English learning
        if (voice.lang === "en-US" || voice.lang === "en_US") {
          score += 15;
        } else if (voice.lang === "en-GB" || voice.lang === "en_GB") {
          score += 10;
        } else if (voice.lang.startsWith("en-")) {
          score += 5;
        }
        
        // Penalize typical default robotic voices if they are basic
        if (name.includes("desktop") || name.includes("zira") || name.includes("david")) {
          score -= 30;
        }
        
        return score;
      };

      const updateVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        // Filter for English voices
        const englishVoices = allVoices.filter(
          (v) => v.lang.startsWith("en-") || v.lang === "en"
        );
        
        // Sort with best quality first
        englishVoices.sort((a, b) => getVoiceScore(b) - getVoiceScore(a));
        setVoices(englishVoices);

        // Auto-select the best voice if none has been selected yet
        const savedVoice = localStorage.getItem("tts_voice_name");
        if (!savedVoice && englishVoices.length > 0) {
          setSelectedVoiceName(englishVoices[0].name);
        }
      };

      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, []);

  // Save selected voice & playback rate to localStorage
  useEffect(() => {
    localStorage.setItem("tts_voice_name", selectedVoiceName);
  }, [selectedVoiceName]);

  useEffect(() => {
    localStorage.setItem("tts_playback_rate", playbackRate.toString());
  }, [playbackRate]);

  // Active verb reference
  const activeVerb = exercises.find((v) => v.id === selectedVerbId) || exercises[0] || VERB_EXERCISES[0];
  const rawActiveSentence: TenseSentence = activeVerb.sentences[currentTenseIndex] || activeVerb.sentences[0];

  const activeSentence = useMemo(() => {
    if (useAllSubjects) {
      return rawActiveSentence;
    }
    return {
      ...rawActiveSentence,
      sentence: convertEnglishToI(rawActiveSentence.sentence, rawActiveSentence.tenseId, activeVerb.verbEN),
      translation: convertSpanishToYo(rawActiveSentence.translation, rawActiveSentence.tenseId, activeVerb.verbES),
      pronunciationTip: convertTipToI(rawActiveSentence.pronunciationTip, rawActiveSentence.tenseId)
    };
  }, [rawActiveSentence, useAllSubjects, activeVerb.verbEN, activeVerb.verbES]);

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  // Audio playback references for Gemini high-quality TTS
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ttsCacheRef = useRef<Record<string, string>>({});
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<boolean>(false);

  // --- Effects ---
  // Auto-dismiss TTS Warning after 10 seconds, except for quota warnings which require user action
  useEffect(() => {
    if (ttsWarning) {
      const isQuotaWarning = ttsWarning.toLowerCase().includes("cuota") || 
                             ttsWarning.toLowerCase().includes("límite") || 
                             ttsWarning.toLowerCase().includes("quota") || 
                             ttsWarning.toLowerCase().includes("exhausted") || 
                             ttsWarning.toLowerCase().includes("429");
      if (isQuotaWarning) return; // Do not auto-dismiss quota warnings, let the user click the one-click fallback button or close manually

      const timer = setTimeout(() => {
        setTtsWarning(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [ttsWarning]);

  // Save exercises on changes
  useEffect(() => {
    localStorage.setItem("tense_coach_exercises", JSON.stringify(exercises));
  }, [exercises]);

  // Load Stats from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("tense_coach_stats");
    if (saved) {
      try {
        setStats(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading stats, using defaults:", e);
      }
    } else {
      // Base default state initialized to mockup
      const mockupStats: UserStats = {
        streak: 12,
        xp: 1250,
        totalAttempts: 25,
        successfulAttempts: 21,
        lastAttemptDate: new Date().toISOString().split("T")[0]
      };
      setStats(mockupStats);
      localStorage.setItem("tense_coach_stats", JSON.stringify(mockupStats));
    }

    // Check Speech Recognition support
    if (!SpeechRecognitionAPI) {
      setIsSpeechRecognitionSupported(false);
    }
  }, []);

  // Save stats on update
  const saveStats = (updated: UserStats) => {
    setStats(updated);
    localStorage.setItem("tense_coach_stats", JSON.stringify(updated));
  };

  const handleAddVerb = (newVerb: VerbExercise) => {
    setExercises((prev) => [...prev, newVerb]);
    setSelectedVerbId(newVerb.id);
    setCurrentTenseIndex(0);
  };

  const handleDeleteVerb = (verbId: string) => {
    setExercises((prev) => {
      const filtered = prev.filter((v) => v.id !== verbId);
      if (selectedVerbId === verbId) {
        const nextActive = filtered[0] || VERB_EXERCISES[0];
        setSelectedVerbId(nextActive.id);
        setCurrentTenseIndex(0);
      }
      return filtered;
    });
  };

  // Reset exercise states when verb or tense changes
  useEffect(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setAnalysisResult(null);
    setServerError(null);
    setMicError(null);
    setManualSpokenText("");
    
    // Stop recording if active
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      setIsListening(false);
    }
  }, [selectedVerbId, currentTenseIndex]);

  // Autoplay audio when active sentence changes
  useEffect(() => {
    if (!showSplash && !showWelcomeScreen && autoplayTts && activeSentence && activeSentence.sentence) {
      const timer = setTimeout(() => {
        handleSpeakText(activeSentence.sentence);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [selectedVerbId, currentTenseIndex, autoplayTts, showSplash, showWelcomeScreen]);

  // Clean up recognition ref on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // --- Speech Synthesis (Text-to-Speech) ---
  const handleSpeakText = async (text: string) => {
    // 1. Cancel any playing speechSynthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    // 2. Stop any playing Gemini audio source
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (e) {}
      currentAudioSourceRef.current = null;
    }

    const isGeminiVoice = selectedVoiceName.startsWith("gemini-");

    if (isGeminiVoice) {
      if (!userApiKey) {
        setHighlightApiKey(true);
        setTimeout(() => setHighlightApiKey(false), 2500);
        fallbackSpeechSynthesis(text);
        return;
      }

      if (isGeminiQuotaExhausted) {
        fallbackSpeechSynthesis(text);
        return;
      }
      try {
        setIsGeneratingSpeech(true);
        const voiceMapping: Record<string, string> = {
          "gemini-puck": "Puck",
          "gemini-charon": "Charon",
          "gemini-kore": "Kore",
          "gemini-fenrir": "Fenrir",
          "gemini-zephyr": "Zephyr",
        };
        const voiceName = voiceMapping[selectedVoiceName] || "Kore";
        const cacheKey = `${text}_${voiceName}`;

        let audioData = ttsCacheRef.current[cacheKey];

        if (!audioData) {
          const response = await fetch("/api/generate-tts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(userApiKey ? { "x-gemini-api-key": userApiKey } : {})
            },
            body: JSON.stringify({ text, voiceName }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Fallo al generar audio de Gemini.");
          }

          const data = await response.json();
          if (data.audio) {
            audioData = data.audio;
            ttsCacheRef.current[cacheKey] = data.audio;
          } else {
            throw new Error("No se pudo obtener el audio de la respuesta de Gemini.");
          }
        }

        if (audioData) {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          }
          const ctx = audioContextRef.current;
          if (ctx.state === "suspended") {
            await ctx.resume();
          }
          
          const binaryString = window.atob(audioData);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const int16Array = new Int16Array(bytes.buffer);
          const float32Array = new Float32Array(int16Array.length);
          for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768;
          }

          const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
          audioBuffer.getChannelData(0).set(float32Array);

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = playbackRate;
          source.connect(ctx.destination);
          source.start(0);
          
          currentAudioSourceRef.current = source;
          // Clear any active warning if successful
          setTtsWarning(null);
        }
      } catch (err: any) {
        let warnMsg = "No se pudo generar la voz ultra-real de Gemini. Se usará la voz predeterminada del dispositivo.";
        const errorText = err.message || "";
        const isQuota = errorText.includes("cuota") || errorText.includes("límite") || errorText.includes("quota") || errorText.includes("429") || errorText.includes("EXHAUSTED");
        
        if (isQuota) {
          warnMsg = "Límite de cuota gratuita de Gemini TTS alcanzado (máximo 10 peticiones al día o 3 por minuto). Usando voz local del dispositivo de respaldo.";
          console.warn("Límite de cuota gratuita de Gemini TTS alcanzado (Expected):", err);
          
          setIsGeminiQuotaExhausted(true);
          try {
            const todayStr = new Date().toISOString().split("T")[0];
            localStorage.setItem("gemini_tts_quota_exhausted_date", todayStr);
          } catch (e) {}
        } else {
          console.error("Error playing Gemini speech, falling back to browser speechSynthesis:", err);
          if (errorText.includes("API_KEY")) {
            warnMsg = "Falta configurar la clave API de Gemini en la configuración del servidor. Usando voz local de respaldo.";
          } else if (errorText) {
            warnMsg = `${errorText} Usando voz local de respaldo.`;
          }
        }
        
        setTtsWarning(warnMsg);
        fallbackSpeechSynthesis(text);
      } finally {
        setIsGeneratingSpeech(false);
      }
    } else {
      fallbackSpeechSynthesis(text);
    }
  };

  const fallbackSpeechSynthesis = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      
      if (selectedVoiceName) {
        const selectedVoice = voices.find((v) => v.name === selectedVoiceName);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      
      utterance.rate = playbackRate;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("La síntesis de voz no es compatible con este navegador.");
    }
  };

  // --- Speech Recognition Controls ---
  const handleToggleListening = () => {
    if (!isSpeechRecognitionSupported) {
      setShowSimulator(true);
      return;
    }

    if (isListening) {
      // Stop
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      // Clear previous inputs
      setFinalTranscript("");
      setInterimTranscript("");
      setMicError(null);
      setServerError(null);
      setAnalysisResult(null);

      try {
        const SpeechRec = SpeechRecognitionAPI;
        const rec = new SpeechRec();
        rec.lang = "en-US";
        rec.continuous = false;
        rec.interimResults = true;

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (interim) setInterimTranscript(interim);
          if (final) {
            const cleanFinal = final.trim();
            setFinalTranscript(cleanFinal);
            setManualSpokenText(cleanFinal);
            // Auto submit when final transcript arrives
            handleGradePronunciation(cleanFinal);
          }
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          let userFriendlyMessage = "Error con el micrófono.";
          if (event.error === "not-allowed") {
            userFriendlyMessage = "Permiso al micrófono denegado. Habilítalo en tu navegador para continuar.";
          } else if (event.error === "no-speech") {
            userFriendlyMessage = "No escuchamos nada. Vuelve a intentarlo alzando la voz.";
          }
          setMicError(userFriendlyMessage);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err: any) {
        console.error("Initialization error:", err);
        setMicError("No se pudo iniciar el servicio de reconocimiento de voz.");
        setIsListening(false);
      }
    }
  };

  // --- Grade and Connect with Server-Side Gemini API ---
  const handleGradePronunciation = async (textToGrade: string) => {
    if (!textToGrade.trim()) return;

    setIsAnalyzing(true);
    setServerError(null);

    try {
      const response = await fetch("/api/analyze-pronunciation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userApiKey ? { "x-gemini-api-key": userApiKey } : {})
        },
        body: JSON.stringify({
          expectedText: activeSentence.sentence,
          transcribedText: textToGrade,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error === "GEMINI_API_KEY_MISSING") {
          throw new Error("GEMINI_API_KEY_MISSING");
        }
        throw new Error(errorData.message || "Error al calificar con la Inteligencia Artificial.");
      }

      const result: PronunciationResult = await response.json();
      setAnalysisResult(result);

      // Track attempts for statistical updates
      const isSuccessful = result.accuracyScore >= 75;
      
      // Update streak and points
      let newStreak = stats.streak;
      const todayStr = new Date().toISOString().split("T")[0];
      
      if (isSuccessful) {
        // Streak calculation
        if (stats.lastAttemptDate && stats.lastAttemptDate !== todayStr) {
          // If practice is on a subsequent day, advance streak!
          newStreak = stats.streak + 1;
        } else if (!stats.lastAttemptDate) {
          newStreak = 12; // Base mockup streak starting point or 1
        }
      }

      const updatedStats: UserStats = {
        streak: newStreak,
        xp: stats.xp + (isSuccessful ? 100 : 15), // Award 100 XP on success, 15 XP for practicing
        totalAttempts: stats.totalAttempts + 1,
        successfulAttempts: stats.successfulAttempts + (isSuccessful ? 1 : 0),
        lastAttemptDate: todayStr
      };

      saveStats(updatedStats);

    } catch (err: any) {
      console.error(err);
      if (err.message === "GEMINI_API_KEY_MISSING") {
        setServerError("GEMINI_API_KEY_MISSING");
      } else {
        setServerError(err.message || "No pudimos conectar con el tutor de IA. ¿Tienes conexión a internet?");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Simulator Actions (For testing or fallback) ---
  const triggerSimulation = (simulatedText: string) => {
    setFinalTranscript(simulatedText);
    setManualSpokenText(simulatedText);
    handleGradePronunciation(simulatedText);
  };

  // --- Touch Gesture swipe handlers ---
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;

    const threshold = 55; // swipe sensitivity threshold
    // Vertical swipe check (y diff is larger than x diff and exceeds threshold)
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > threshold) {
      if (diffY > 0) {
        handleNextTense();
      } else {
        handlePrevTense();
      }
    }

    touchStartY.current = null;
    touchStartX.current = null;
  };

  // --- Navigation Controls ---
  const handlePrevTense = () => {
    setSlideDirection('down');
    setCurrentTenseIndex((prev) => (prev > 0 ? prev - 1 : activeVerb.sentences.length - 1));
  };

  const handleNextTense = () => {
    setSlideDirection('up');
    setCurrentTenseIndex((prev) => (prev < activeVerb.sentences.length - 1 ? prev + 1 : 0));
  };

  const resetAllStats = () => {
    if (confirm("¿Estás seguro de que quieres restablecer tu progreso, racha y puntos XP?")) {
      const reseted: UserStats = {
        streak: 0,
        xp: 0,
        totalAttempts: 0,
        successfulAttempts: 0,
        lastAttemptDate: undefined
      };
      saveStats(reseted);
      setCurrentTenseIndex(0);
      setSelectedVerbId("work");
    }
  };

  // Progress Bar percentage inside the active verb
  const progressionPercent = Math.round(((currentTenseIndex + 1) / activeVerb.sentences.length) * 100);

  return (
    <div className="bg-[#0f172a] h-[100dvh] md:h-auto md:min-h-screen text-slate-100 p-2.5 sm:p-4 md:p-8 flex flex-col items-center justify-start font-sans relative overflow-hidden md:overflow-x-hidden md:overflow-y-auto" id="applet-viewport">
      
      {/* Splash Screen Overlay */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 bg-[#081125] flex flex-col items-center justify-center z-[9999] pointer-events-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center justify-center px-6 text-center"
            >
              <img 
                src={logoVerbora} 
                alt="Verbora Logo" 
                className="w-[85vw] max-w-[600px] h-auto object-contain select-none animate-pulse"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Screen Overlay */}
      <AnimatePresence>
        {showWelcomeScreen && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#081125]/95 backdrop-blur-md flex flex-col items-center justify-center z-[9998] p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="bg-slate-900 border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-lg mx-auto flex flex-col gap-6 relative"
            >
              {/* Logo / Header */}
              <div className="flex flex-col items-center text-center gap-2">
                <img 
                  src={logoVerbora} 
                  alt="Verbora" 
                  className="w-48 h-auto object-contain select-none mb-1"
                />
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display">
                  ¡Te damos la bienvenida!
                </h3>
                <p className="text-xs sm:text-sm text-white/60">
                  Selecciona uno de los verbos recomendados o escribe la palabra que desees practicar.
                </p>
              </div>

              {/* Predefined Verbs Grid */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-teal-400 tracking-wider uppercase">Verbos Recomendados</span>
                <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                  {exercises.slice(0, 6).map((verb) => (
                    <button
                      key={verb.id}
                      onClick={() => {
                        setSelectedVerbId(verb.id);
                        setCurrentTenseIndex(0);
                        setShowWelcomeScreen(false);
                      }}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-teal-500/10 border border-white/5 hover:border-teal-500/20 text-white text-left transition-all flex flex-col gap-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span className="text-xs font-bold font-display">{verb.verbEN}</span>
                      <span className="text-[10px] text-white/40 truncate">{verb.verbES}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input Section */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-teal-400 tracking-wider uppercase">Escribe tu propio verbo o frase</span>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setWelcomeError("");

                    const inputClean = welcomeInputText.trim();
                    if (!inputClean) {
                      setWelcomeError("Por favor ingresa una palabra.");
                      return;
                    }

                    // Duplicate Check
                    const cleanCompare = inputClean.toLowerCase().replace(/^to\s+/i, "");
                    const isDuplicate = exercises.some((ex) => {
                      const exEN = ex.verbEN.toLowerCase().replace(/^to\s+/i, "");
                      const exES = ex.verbES.toLowerCase();
                      return exEN === cleanCompare || exES === cleanCompare;
                    });

                    const capitalize = (s: string) => {
                      const trimmed = s.trim();
                      if (!trimmed) return "";
                      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                    };

                    if (isDuplicate) {
                      setWelcomeError(`La palabra "${capitalize(inputClean.replace(/^(to\s+)/i, ""))}" ya existe en tu lista de prácticas.`);
                      return;
                    }

                    setWelcomeIsGenerating(true);
                    try {
                      const userApiKey = localStorage.getItem("geminiApiKey") || "";
                      const response = await fetch("/api/generate-tenses", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(userApiKey ? { "x-gemini-api-key": userApiKey } : {})
                        },
                        body: JSON.stringify({
                          inputText: inputClean,
                        }),
                      });
                      if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.message || "Error al conectar con la IA.");
                      }
                      const data = await response.json();
                      if (!data.sentences || data.sentences.length === 0) {
                        throw new Error("No se generó el conjunto de tiempos verbales.");
                      }

                      const newVerb: VerbExercise = {
                        id: "custom-" + Date.now(),
                        verbEN: capitalize((data.verbEN || inputClean).replace(/^(to\s+)/i, "")),
                        verbES: capitalize(data.verbES || "Cargado"),
                        difficulty: data.difficulty || "Básico",
                        isCustom: true,
                        sentences: data.sentences.map((s: any) => ({
                          ...s,
                          sentence: capitalize(s.sentence),
                          translation: capitalize(s.translation)
                        })),
                      };
                      handleAddVerb(newVerb);
                      setShowWelcomeScreen(false);
                    } catch (err: any) {
                      setWelcomeError(err.message || "Error al generar.");
                    } finally {
                      setWelcomeIsGenerating(false);
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Ej: Speak, Estudiar, Play..."
                      disabled={welcomeIsGenerating}
                      value={welcomeInputText}
                      onChange={(e) => setWelcomeInputText(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-3.5 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all text-sm font-medium"
                    />
                    <Sparkles className="absolute right-4 w-4 h-4 text-teal-400 pointer-events-none" />
                  </div>

                  {welcomeError && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {welcomeError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={welcomeIsGenerating}
                    className={`w-full py-3.5 rounded-xl text-slate-950 font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      welcomeIsGenerating 
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 animate-pulse cursor-not-allowed" 
                        : "bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-500 hover:to-emerald-500 transform active:scale-[0.98]"
                    }`}
                  >
                    {welcomeIsGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generando Escenarios con IA...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Comenzar a practicar
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG Gradient definitions for icons */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" /> {/* violet-600 */}
            <stop offset="50%" stopColor="#3b82f6" /> {/* blue-500 */}
            <stop offset="100%" stopColor="#06b6d4" /> {/* cyan-500 */}
          </linearGradient>
        </defs>
      </svg>

      {/* Mesh Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none select-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none select-none z-0"></div>
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-teal-500/15 rounded-full blur-[100px] pointer-events-none select-none z-0"></div>

      <div className="w-full max-w-2xl flex flex-col gap-1.5 md:gap-4 h-full md:h-auto z-10 relative overflow-hidden md:overflow-visible" id="applet-container">
        
        {/* HERO APP BAR WITH CONFIGURATION BUTTON */}
        <div className="flex justify-between items-center px-1 mb-0.5" id="hero-app-bar">
          <div className="flex items-center h-[30px] sm:h-[36px] overflow-hidden select-none">
            <img 
              src={letrasVerbora} 
              alt="Verbora" 
              className="h-[90px] sm:h-[105px] object-contain my-[-30px] sm:my-[-34.5px]"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* API Key Button */}
            <motion.button
              animate={highlightApiKey ? { scale: [1, 1.15, 1, 1.15, 1], rotate: [0, -10, 10, -10, 0] } : {}}
              transition={{ duration: 0.5 }}
              onClick={() => setIsApiKeyModalOpen(true)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer select-none shadow-sm ${
                highlightApiKey 
                  ? "bg-amber-500/30 border border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] text-amber-200" 
                  : "bg-gradient-to-r from-violet-600/15 via-blue-500/15 to-teal-500/15 hover:from-violet-600/25 hover:via-blue-500/25 hover:to-teal-500/25 border border-blue-500/30 hover:border-blue-500/50 text-white/90 hover:text-white"
              }`}
              title="Configurar API Key"
            >
              {userApiKey ? <Key className="w-4 h-4 text-teal-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
            </motion.button>
            {/* Configuration Button */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-r from-violet-600/15 via-blue-500/15 to-teal-500/15 hover:from-violet-600/25 hover:via-blue-500/25 hover:to-teal-500/25 border border-blue-500/30 hover:border-blue-500/50 text-white/90 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer select-none shadow-sm"
              title="Configuración de Voz y Velocidad"
            >
              <Settings className="w-4 h-4" style={{ stroke: "url(#logo-gradient)" }} />
              <span className="text-xs font-bold text-white/85 hidden xs:inline">Configuración</span>
            </button>
          </div>
        </div>

        {/* UPPER PROGRESS RULER */}
        <div className="flex items-center justify-between px-1" id="upper-progress-header">
          <div className="flex items-center gap-3 w-2/3">
            <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressionPercent}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full"
              />
            </div>
            <span className="text-[11px] font-bold text-teal-400 tracking-wider shrink-0 font-mono">
              {currentTenseIndex + 1} / {activeVerb.sentences.length}
            </span>
          </div>
        </div>

        {/* VERB SELECTOR PANEL */}
        <VerbSelector 
          exercises={exercises}
          selectedVerbId={selectedVerbId} 
          onSelectVerb={(vId) => {
            setSelectedVerbId(vId);
            setCurrentTenseIndex(0);
          }} 
          onAddVerb={handleAddVerb}
          onDeleteVerb={handleDeleteVerb}
        />

        {/* CENTRAL MASTER WORKOUT CARD */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex-1 md:flex-initial bg-white/5 backdrop-blur-2xl rounded-3xl p-3.5 sm:p-8 md:p-10 shadow-2xl border border-white/10 relative flex flex-col justify-start overflow-hidden md:overflow-visible min-h-0 select-none" 
          id="workout-card"
        >
          
          <div className="relative flex-1 flex flex-col min-h-0 w-full overflow-hidden mt-3 sm:mt-6">
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={`${selectedVerbId}-${currentTenseIndex}`}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex-1 flex flex-col justify-start min-h-0 overflow-y-auto pr-1 scrollbar-thin md:overflow-visible"
              >
                {/* Practice Phrase Display */}
                <div className="text-center my-2 sm:my-8 shrink-0" id="core-phrase-section">
                  <h1 className="text-white font-bold text-xl sm:text-4xl md:text-5xl leading-tight font-display tracking-tight select-all">
                    {activeSentence.sentence}
                  </h1>
       
                  {/* Pronunciation Speaker button */}
                  <div className="mt-2.5 sm:mt-5 flex flex-col items-center gap-2" id="tts-audio-trigger">
                    <div className="flex justify-center items-center gap-3">
                      <motion.button
                        whileHover={{ scale: isGeneratingSpeech ? 1 : 1.1 }}
                        whileTap={{ scale: isGeneratingSpeech ? 1 : 0.9 }}
                        disabled={isGeneratingSpeech}
                        onClick={() => handleSpeakText(activeSentence.sentence)}
                        className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center shadow-lg transition-all cursor-pointer ${
                          isGeneratingSpeech 
                            ? "bg-teal-500/10 text-teal-300 border-teal-500/20 animate-pulse cursor-not-allowed" 
                            : "bg-white/5 text-teal-300 border-white/10 hover:bg-teal-400 hover:text-slate-950"
                        }`}
                        title="Escuchar pronunciación correcta"
                      >
                        {isGeneratingSpeech ? (
                          <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </motion.button>
                    </div>
                    {isGeneratingSpeech && (
                      <span className="text-[10px] text-teal-400/80 font-medium animate-pulse">
                        Sintetizando voz de IA realista...
                      </span>
                    )}
                  </div>
                </div>
       
                <div className="border-t border-dashed border-white/10 my-2 sm:my-6 shrink-0" />
       
                {/* Spanish Meaning Label */}
                <div className="flex items-center justify-center gap-2 text-white/80 font-medium text-xs sm:text-base md:text-lg py-1 shrink-0" id="spanish-meaning-row">
                  <Globe className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-teal-400" />
                  <span>{activeSentence.translation}</span>
                </div>
       
                {/* Grammar explanation is always visible */}
                <div className="mt-2 sm:mt-6" id="tip-intro-box">
                  <TenseVisualGuide 
                    tenseId={activeSentence.tenseId}
                    tenseNameEN={activeSentence.tenseNameEN}
                    tenseNameES={activeSentence.tenseNameES}
                    pronunciationTip={activeSentence.pronunciationTip}
                  />
                </div>
      
                {/* Real-time speech result container */}
                <div className="mt-6" id="realtime-interactive-feed">
                  {isListening && (
                    <div className="bg-teal-500/5 text-teal-200 border border-teal-500/20 rounded-2xl p-4 text-center text-sm font-medium animate-pulse">
                      <span className="flex items-center justify-center gap-1.5 text-[10px] text-teal-400 uppercase font-black mb-1.5 tracking-widest">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                        </span>
                        Micrófono Activo
                      </span>
                      <p className="text-white font-bold text-base mt-2">
                        {interimTranscript || "Esperando voz... Di la frase ahora."}
                      </p>
                    </div>
                  )}
      
                  {!isListening && finalTranscript && !analysisResult && (
                    <div className="bg-white/5 text-white border border-white/10 rounded-2xl p-4 text-center text-sm font-medium">
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Dijeste:</p>
                      <p className="text-teal-300 font-bold text-lg mt-1 select-all">"{finalTranscript}"</p>
                      <div className="mt-4 flex gap-3.5 justify-center">
                        <button 
                          onClick={() => handleGradePronunciation(finalTranscript)}
                          className="bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-bold hover:brightness-110 transition-colors shadow-lg shadow-teal-500/20"
                        >
                          Evaluar de nuevo
                        </button>
                        <button 
                          onClick={() => {
                            setFinalTranscript("");
                            setInterimTranscript("");
                          }}
                          className="bg-white/10 hover:bg-white/15 text-white/95 px-4 py-1.5 rounded-xl text-xs font-bold transition-colors"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  )}
      
                  {/* ERROR DISPLAY */}
                  {micError && (
                    <div className="bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-2xl p-4 text-xs text-center font-medium mt-3 flex flex-col gap-1 items-center justify-center">
                      <span className="font-bold flex items-center gap-1 text-rose-200"><AlertTriangle className="w-3.5 h-3.5" /> Micrófono bloqueado</span>
                      <p className="text-white/70">{micError}</p>
                    </div>
                  )}
      
                  {/* TUTOR AI ANALYSIS DISPLAY */}
                  {isAnalyzing && (
                    <div className="bg-teal-500/5 rounded-2xl p-6 text-center border border-teal-500/15">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-white/90">Analizando pronunciación con IA...</p>
                      <p className="text-xs text-white/50 mt-1">Evaluando fonemas del tiempo verbal exacto.</p>
                    </div>
                  )}
      
                  {serverError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 text-center mt-3 text-xs text-rose-300">
                      {serverError === "GEMINI_API_KEY_MISSING" ? (
                        <div className="space-y-3 text-left">
                          <span className="font-bold text-sm block text-center text-rose-200">Requiere Gemini API Key</span>
                          <p className="text-white/70 leading-relaxed text-xs">
                            El tutor de Inteligencia Artificial requiere configurar tu propia clave. Abre la pestaña <strong className="text-white">Settings &gt; Secrets</strong> en el panel de control de AI Studio y añade tu clave como <strong className="text-white">GEMINI_API_KEY</strong>.
                          </p>
                        </div>
                      ) : (
                        <p>{serverError}</p>
                      )}
                    </div>
                  )}
      
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Tense Badge & Navigation row (Moved to bottom) */}
          {activeVerb.sentences.length > 1 ? (
            <div className="flex items-center justify-between shrink-0 mt-3 pt-3 border-t border-white/10" id="card-navigation-row">
              <button 
                onClick={handlePrevTense} 
                className="p-1.5 px-2.5 text-white/40 hover:text-teal-400 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                title="Tiempo verbal anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
 
              <span className="px-4 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-teal-500/30 text-center">
                {activeSentence.tenseNameES}
              </span>
 
              <button 
                onClick={handleNextTense}
                className="p-1.5 px-2.5 text-white/40 hover:text-teal-400 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                title="Tiempo verbal siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center shrink-0 mt-3 pt-3 border-t border-white/10" id="card-navigation-row">
              <span className="px-4 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-teal-500/30 text-center">
                {activeSentence.tenseNameES}
              </span>
            </div>
          )}
        </div>

        {/* FLOATING ACTION RECORD ROW */}
        <div className="flex flex-col items-center justify-center relative my-1.5 sm:my-4 shrink-0" id="microphone-row">
          
          {/* Waveform graphic lines */}
          <div className="absolute left-6 right-6 sm:left-8 sm:right-8 flex justify-between items-center pointer-events-none select-none" id="waves-holder">
            {/* Left Waveform bars */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {[0.3, 0.5, 0.2, 0.4, 0.6, 0.1].map((scale, i) => (
                <motion.div 
                  key={`l-${i}`}
                  animate={isListening ? { height: ["8px", `${28 * scale}px`, "8px"] } : { height: "8px" }}
                  transition={{ repeat: Infinity, duration: 0.5 + i * 0.1, ease: "easeIn" }}
                  className="w-[2px] sm:w-[3px] bg-teal-400/40 shadow-[0_0_8px_rgba(45,212,191,0.2)] rounded-full shrink-0"
                />
              ))}
            </div>
 
            {/* Right Waveform bars */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {[0.1, 0.6, 0.4, 0.2, 0.5, 0.3].map((scale, i) => (
                <motion.div 
                  key={`r-${i}`}
                  animate={isListening ? { height: ["8px", `${28 * scale}px`, "8px"] } : { height: "8px" }}
                  transition={{ repeat: Infinity, duration: 0.5 + i * 0.1, ease: "easeIn" }}
                  className="w-[2px] sm:w-[3px] bg-teal-400/40 shadow-[0_0_8px_rgba(45,212,191,0.2)] rounded-full shrink-0"
                />
              ))}
            </div>
          </div>
 
          {/* Huge floating mic trigger */}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleListening}
            className={`w-10 h-10 sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center relative transition-all cursor-pointer ${
              isListening 
                ? "bg-gradient-to-tr from-rose-500 to-red-600 shadow-[0_0_30px_rgba(244,63,94,0.4)]" 
                : "bg-gradient-to-tr from-violet-600 via-blue-500 to-teal-400 shadow-[0_0_40px_rgba(59,130,246,0.35)] text-white hover:brightness-110"
            }`}
            id="mic-circle"
          >
            {isListening ? (
              <MicOff className="w-[15px] h-[15px] sm:w-[22.5px] sm:h-[22.5px] text-white animate-pulse" />
            ) : (
              <Mic className="w-[15px] h-[15px] sm:w-[22.5px] sm:h-[22.5px] text-white" />
            )}
 
            {/* Recording visual effect ring */}
            {isListening && (
              <div className="absolute inset-0 rounded-full border-4 border-rose-300/40 animate-ping" />
            )}
          </motion.button>
 
          <span className="text-[9px] sm:text-[10px] text-white/40 font-bold tracking-widest mt-2 sm:mt-3 block uppercase" id="click-status">
            {isListening ? "PRESIONA PARA DETENER" : "PRESIONA EL MICRÓFONO PARA HABLAR"}
          </span>
        </div>
 

        {/* MODAL EMERGENTE DE RETROALIMENTACIÓN DE PRONUNCIACIÓN */}
        <AnimatePresence>
          {analysisResult && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAnalysisResult(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />

              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-[#131b2e] border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10 text-left"
              >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-teal-400" />
                    <h3 className="text-sm font-bold text-white tracking-wide">Retroalimentación del Tutor</h3>
                  </div>
                  <button
                    onClick={() => setAnalysisResult(null)}
                    className="p-1 text-white/40 hover:text-white/80 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Details Container with scroll */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4 scrollbar-thin">
                  <PronunciationDetails 
                    result={analysisResult} 
                    expectedSentence={activeSentence.sentence} 
                  />
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end shrink-0">
                  <button
                    onClick={() => setAnalysisResult(null)}
                    className="bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-bold hover:brightness-110 transition-colors shadow-lg cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL PARA CONFIGURACIÓN DE VOZ */}
        <AnimatePresence>
          {isConfigOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsConfigOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />

              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-md max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-[#131b2e] border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10 text-left"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-teal-400" />
                    <h3 className="text-sm font-bold text-white tracking-wide">Configuración de Voz</h3>
                  </div>
                  <button
                    onClick={() => setIsConfigOpen(false)}
                    className="p-1 text-white/40 hover:text-white/80 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 scrollbar-none">
                  {/* Voice Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
                      Voz en Inglés (TTS)
                    </label>
                    <div className="space-y-2">
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => handleVoiceChange(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 cursor-pointer"
                      >
                        <optgroup label="✨ Voces de IA Ultra-Realistas (Recomendado)" className="bg-[#131b2e] text-teal-300 font-semibold">
                          <option value="gemini-kore" className="bg-[#131b2e] text-white">Gemini Kore 👩 (Elegante y Clara)</option>
                          <option value="gemini-zephyr" className="bg-[#131b2e] text-white">Gemini Zephyr 👩‍🦰 (Enérgica y Fluida)</option>
                          <option value="gemini-puck" className="bg-[#131b2e] text-white">Gemini Puck 👨‍🦱 (Juvenil y Amigable)</option>
                          <option value="gemini-charon" className="bg-[#131b2e] text-white">Gemini Charon 🧔 (Profunda y Serena)</option>
                          <option value="gemini-fenrir" className="bg-[#131b2e] text-white">Gemini Fenrir 👦 (Cálida y Directa)</option>
                        </optgroup>

                        <optgroup label="🌐 Voces del Sistema" className="bg-[#131b2e] text-white/50">
                          <option value="" className="bg-[#131b2e] text-white">Predeterminada del sistema</option>
                          {voices.map((voice) => {
                            const isPremium = 
                              voice.name.toLowerCase().includes("natural") ||
                              voice.name.toLowerCase().includes("google") ||
                              voice.name.toLowerCase().includes("online") ||
                              voice.name.toLowerCase().includes("premium") ||
                              voice.name.toLowerCase().includes("samantha") ||
                              voice.name.toLowerCase().includes("daniel");

                            return (
                              <option key={voice.name} value={voice.name} className="bg-[#131b2e] text-white">
                                {voice.name} {isPremium ? "✨ (Alta Fidelidad)" : ""} ({voice.lang})
                              </option>
                            );
                          })}
                        </optgroup>
                      </select>

                      {isGeminiQuotaExhausted && (
                        <div className="text-[10.5px] bg-amber-500/10 border border-amber-500/20 text-amber-200 p-3 rounded-xl space-y-1">
                          <p className="font-bold flex items-center gap-1">
                            <span>⚠️ Cuota agotada por hoy (Límite de la API de Gemini)</span>
                          </p>
                          <p className="text-white/70 leading-relaxed">
                            Has consumido las 10 peticiones gratuitas diarias permitidas por la cuota de Gemini. El sistema usará automáticamente las <strong className="text-amber-300">voces locales de tu dispositivo</strong> sin ningún límite.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setIsGeminiQuotaExhausted(false);
                              try {
                                localStorage.removeItem("gemini_tts_quota_exhausted_date");
                              } catch (e) {}
                            }}
                            className="text-[10px] text-amber-300 underline font-semibold hover:text-white cursor-pointer"
                          >
                            Reintentar voz ultra-realista
                          </button>
                        </div>
                      )}
                      
                      <div className="text-[10.5px] bg-teal-500/5 border border-teal-500/10 p-3 rounded-xl text-white/75 leading-relaxed space-y-1.5">
                        <p className="font-semibold text-teal-300 flex items-center gap-1">
                          <span>💡 Sobre las voces ultra-reales:</span>
                        </p>
                        <p className="text-white/60">
                          Hemos integrado <strong className="text-teal-400">voces neuronales avanzadas de Gemini</strong> que suenan sumamente humanas, expresivas y fluidas, ideales para estudiar la entonación nativa.
                        </p>
                        {voices.length > 0 && (
                          <p className="text-white/60 pt-1 border-t border-white/5">
                            Si lo prefieres, también puedes utilizar las voces locales de tu dispositivo (como las de Microsoft Edge, Google Chrome o Apple Safari) seleccionándolas en "Voces del Sistema".
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Speed (Rate) Selection */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
                        Velocidad de Reproducción
                      </label>
                      <span className="text-xs font-mono font-bold text-teal-400">
                        {playbackRate.toFixed(2)}x
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                      className="w-full accent-teal-400 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />

                    {/* Preset Speed Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        { label: "Lento", value: 0.7 },
                        { label: "Medio", value: 0.85 },
                        { label: "Normal", value: 1.0 },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setPlaybackRate(preset.value)}
                          className={`py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                            Math.abs(playbackRate - preset.value) < 0.01
                              ? "bg-teal-500/10 text-teal-300 border-teal-500/20"
                              : "bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {preset.label} ({preset.value}x)
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-white/10 my-4" />

                  {/* Grammatical Subjects Toggle */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
                      Sujetos de Práctica
                    </label>
                    <label className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 p-3.5 rounded-2xl cursor-pointer select-none transition-all group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={useAllSubjects}
                          onChange={(e) => setUseAllSubjects(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-teal-500 focus:ring-teal-400 focus:ring-opacity-25 border-white/20 bg-slate-900 cursor-pointer accent-teal-400 transition-all"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-white block group-hover:text-teal-300 transition-colors">
                          Todos los sujetos (I, You, She, We, etc.)
                        </span>
                        <span className="text-[10px] text-white/50 block mt-0.5 leading-relaxed">
                          {useAllSubjects
                            ? "Las oraciones variarán entre distintos pronombres para una práctica más completa."
                            : "Todas las oraciones se adaptarán para usar únicamente 'I' (Yo)."}
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="border-t border-dashed border-white/10 my-4" />

                  {/* Autoplay Toggle */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
                      Reproducción Automática
                    </label>
                    <label className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 p-3.5 rounded-2xl cursor-pointer select-none transition-all group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={autoplayTts}
                          onChange={(e) => setAutoplayTts(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-teal-500 focus:ring-teal-400 focus:ring-opacity-25 border-white/20 bg-slate-900 cursor-pointer accent-teal-400 transition-all"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-white block group-hover:text-teal-300 transition-colors">
                          Reproducir voz de forma automática
                        </span>
                        <span className="text-[10px] text-white/50 block mt-0.5 leading-relaxed">
                          {autoplayTts
                            ? "Al cambiar de oración o verbo, el audio nativo se reproducirá de inmediato."
                            : "Solo se reproducirá el audio cuando presiones el botón de parlante. Recomendado para ahorrar recursos y navegar más rápido."}
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="border-t border-dashed border-white/10 my-4" />

                  {/* Test button & Accept button */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleSpeakText("Hello! Let's practice some English.")}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-teal-300 rounded-xl text-xs font-bold transition-all border border-teal-500/20 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Probar voz</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsConfigOpen(false)}
                      className="bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold hover:brightness-110 transition-all shadow-lg cursor-pointer"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* API Key Modal */}
        <AnimatePresence>
          {isApiKeyModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsApiKeyModalOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-slate-900 border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md mx-auto flex flex-col gap-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-teal-400" />
                    Configurar API Key
                  </h3>
                  <button
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-white/60">
                    Ingresa tu API Key (Gemini, ChatGPT u otros compatibles) para activar las voces ultrarrealistas y las evaluaciones avanzadas por IA.
                  </p>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveApiKey(tempApiKey);
                      }
                    }}
                  />
                  {!tempApiKey && (
                    <p className="text-xs text-amber-400 flex items-center gap-1.5 mt-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      El uso de la IA de Gemini está limitado si no agregas tu propia llave.
                    </p>
                  )}
                  
                  <button
                    onClick={() => saveApiKey(tempApiKey)}
                    className="w-full mt-2 py-3 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-500 hover:to-emerald-500 text-slate-950 font-extrabold rounded-xl shadow-lg transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 text-slate-950" strokeWidth={3} />
                    Guardar Clave
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
 
      </div>
    </div>
  );
}
