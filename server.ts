import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Accept JSON payload
  app.use(express.json());

  // Pronunciation analyzer route using Gemini
  app.post("/api/analyze-pronunciation", async (req, res) => {
    try {
      const { expectedText, transcribedText } = req.body;

      if (!expectedText || transcribedText === undefined) {
        return res.status(400).json({
          error: "BAD_REQUEST",
          message: "Faltan parámetros obligatorios: expectedText y transcribedText.",
        });
      }

      const apiKey = req.headers["x-gemini-api-key"] || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY_MISSING",
          message: "Para calificar tu pronunciación con IA avanzada, por favor configura tu clave API de Gemini.",
        });
      }

      const systemInstruction = `Eres un entrenador de pronunciación en inglés experto y de gran apoyo, especializado en enseñar a personas de habla hispana cómo dominar la entonación y pronunciación de verbos en inglés en distintos tiempos verbales.
Compararás la frase esperada en inglés (expectedText) con la transcripción de voz lograda por el micrófono del usuario (transcribedText).
Calcularás una puntuación de precisión (accuracyScore) entre 0 y 100 evaluando qué tan cercanas e inteligibles son las palabras.
Si hay discrepancias relevantes de tiempo verbal (por ejemplo, el usuario omitió la finalización dental '-ed' en un pasado de verbo regular como 'worked' pronunciándolo erróneamente solo como 'work', o confundió un gerundio 'working'), marca matched=false para esa palabra, describe detalladamente la diferencia fonológica en 'feedback', y brinda consejos prácticos claros y estimulantes de fonética en español.
Proporciona en 'phoneticGuide' una representación simplificada o aproximación a la fonética IPA que un hispanohablante pueda comprender con facilidad, de modo de asistir al usuario en sus intentos futuros.
Mantén comentarios breves en español para cada palabra en 'details'. Sé proactivo, amable, educativo y motivador.`;

      const prompt = `Frase modelo esperada a pronunciar: "${expectedText}"
Frase real transcrita del usuario: "${transcribedText}"

Analiza la precisión de la pronunciación de cada palabra. Si el texto transcrito está completamente vacío, devuelve un puntaje de 0 e indica amigablemente al participante que repita la frase con micrófono activador encendido.`;

      const responseSchema = {
        type: "OBJECT",
        properties: {
          accuracyScore: {
            type: "INTEGER",
            description: "Puntuación general de precisión en la pronunciación (0 a 100).",
          },
          feedback: {
            type: "STRING",
            description: "Análisis explicativo sobre la pronunciación del participante, con recomendaciones fonéticas específicas en español.",
          },
          phoneticGuide: {
            type: "STRING",
            description: "Guía de pronunciación fonética aproximada o IPA útil para hispanos, ej: /aɪ wɜːrkt/.",
          },
          details: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                word: { type: "STRING", description: "Palabra limpia esperada de la oración modelo." },
                matched: { type: "BOOLEAN", description: "Si la palabra del usuario coincidió o se aproximó con éxito." },
                comment: { type: "STRING", description: "Feedback u opinión corta en español sobre la palabra, o vacío si fue excelente." },
              },
              required: ["word", "matched"],
            },
            description: "Análisis pormenorizado de coincidencia palabra por palabra.",
          },
        },
        required: ["accuracyScore", "feedback", "phoneticGuide", "details"],
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
      const result = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": (apiKey as string).trim(),
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.15,
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
      });

      if (!result.ok) {
        const errText = await result.text();
        throw new Error(`Status ${result.status}: ${errText}`);
      }

      const data = await result.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error("No se obtuvo texto de respuesta de la IA.");
      }

      const responseJSON = JSON.parse(responseText.trim());
      return res.json(responseJSON);
    } catch (error: any) {
      const errStr = String(error) + " " + JSON.stringify(error);
      const isQuota = errStr.includes("429") || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED");

      if (isQuota) {
        console.warn("Límite de cuota o de velocidad alcanzado en la evaluación:", error.message || error);
        return res.status(429).json({
          error: "QUOTA_EXHAUSTED",
          message: "Has excedido el límite de cuota o de velocidad para la evaluación con IA. Por favor, intenta de nuevo en un momento.",
        });
      }

      console.error("Error evaluando pronunciación:", error);
      return res.status(500).json({
        error: "SERVER_ERROR",
        message: error.message || "Ha ocurrido un error en la comunicación con el servidor al procesar la evaluación.",
      });
    }
  });


  // TTS Route using gemini-3.1-flash-tts-preview
  app.post("/api/generate-tts", async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      if (!text) {
        return res.status(400).json({ error: "BAD_REQUEST", message: "Falta el texto a sintetizar." });
      }

      // Strict requirement: Only user's frontend API key is allowed for TTS to prevent server quota exhaustion
      const apiKey = req.headers["x-gemini-api-key"];
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY_MISSING",
          message: "Para usar las Voces Premium, por favor configura tu API Key de Gemini en el ícono de la llave de la aplicación.",
        });
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`;
      const result = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": (apiKey as string).trim()
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
              },
            },
          }
        })
      });

      if (!result.ok) {
        const errText = await result.text();
        throw new Error(`Status ${result.status}: ${errText}`);
      }

      const data = await result.json();
      const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("La IA no generó los datos de audio.");
      }

      return res.json({ audio: base64Audio });
    } catch (error: any) {
      let errorMessage = error.message || "No se pudo generar la voz ultra-real de IA.";
      let errorCode = "TTS_FAILED";
      
      const errStr = String(error) + " " + JSON.stringify(error);
      const isQuota = errStr.includes("429") || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429") || errorMessage.includes("quota");
      
      if (isQuota) {
        errorCode = "QUOTA_EXHAUSTED";
        errorMessage = "Has excedido el límite de cuota gratuita para la voz ultra-realista de Gemini TTS (máximo 10 peticiones al día o 3 por minuto). Por favor, intenta de nuevo en un momento o selecciona otra voz.";
        console.warn("Límite de cuota gratuita de Gemini TTS alcanzado (Expected):", errorMessage);
      } else {
        console.error("Error generating Gemini TTS:", error);
      }
      
      const status = errorCode === "QUOTA_EXHAUSTED" ? 429 : 500;
      return res.status(status).json({
        error: errorCode,
        message: errorMessage,
      });
    }
  });

  // Helper for fallback tenses generation when API key is missing or fails
  function generateFallbackTenses(verbEN: string, verbES: string): any[] {
    let baseEN = verbEN.trim();
    if (baseEN.toLowerCase().startsWith("to ")) {
      baseEN = baseEN.substring(3).trim();
    }
    const baseES = verbES.trim();
    const baseLower = baseEN.toLowerCase();
    
    let pastEN = baseEN + "ed";
    let partEN = baseEN + "ed";
    let ingEN = baseEN + "ing";
    
    if (baseLower.endsWith("e")) {
      pastEN = baseEN + "d";
      partEN = baseEN + "d";
      ingEN = baseEN.slice(0, -1) + "ing";
    } else if (baseLower.endsWith("y") && !/[aeiou]y$/.test(baseLower)) {
      pastEN = baseEN.slice(0, -1) + "ied";
      partEN = baseEN.slice(0, -1) + "ied";
      ingEN = baseEN + "ing";
    } else if (baseLower === "run") {
      pastEN = "ran";
      partEN = "run";
      ingEN = "running";
    } else if (baseLower === "go") {
      pastEN = "went";
      partEN = "gone";
      ingEN = "going";
    } else if (baseLower === "do") {
      pastEN = "did";
      partEN = "done";
      ingEN = "doing";
    } else if (baseLower === "see") {
      pastEN = "saw";
      partEN = "seen";
      ingEN = "seeing";
    } else if (baseLower === "speak") {
      pastEN = "spoke";
      partEN = "spoken";
      ingEN = "speaking";
    } else if (baseLower === "write") {
      pastEN = "wrote";
      partEN = "written";
      ingEN = "writing";
    } else if (baseLower === "take") {
      pastEN = "took";
      partEN = "taken";
      ingEN = "taking";
    } else if (baseLower === "make") {
      pastEN = "made";
      partEN = "made";
      ingEN = "making";
    } else if (baseLower === "read") {
      pastEN = "read";
      partEN = "read";
      ingEN = "reading";
    }

    const cvcRegex = /^[b-df-hj-np-tv-z]+[aeiou][b-df-hj-np-tv-z]$/i;
    if (cvcRegex.test(baseLower) && !["w", "x", "y"].includes(baseLower.slice(-1))) {
      const lastChar = baseLower.slice(-1);
      if (baseLower !== "run") {
        pastEN = baseEN + lastChar + "ed";
        partEN = baseEN + lastChar + "ed";
        ingEN = baseEN + lastChar + "ing";
      }
    }

    const cleanES = baseES.replace(/^to\s+|^a\s+/i, "");
    const rootES = cleanES.replace(/er$|ir$|ar$/, "");
    const endsWithAr = cleanES.toLowerCase().endsWith("ar");
    const endingAndoIendo = endsWithAr ? "ando" : "iendo";
    const endingAdoIdo = endsWithAr ? "ado" : "ido";

    const pool = ["I", "You", "He", "She", "We", "They", "I", "You", "He", "She", "We", "They"];
    const subjects = [...pool];
    for (let i = subjects.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [subjects[i], subjects[j]] = [subjects[j], subjects[i]];
    }

    function getPresentSimpleVerb(base: string) {
      const bl = base.toLowerCase();
      if (bl.endsWith("o") || bl.endsWith("sh") || bl.endsWith("ch") || bl.endsWith("x") || bl.endsWith("ss")) {
        return base + "es";
      }
      if (bl.endsWith("y") && !/[aeiou]y$/.test(bl)) {
        return base.slice(0, -1) + "ies";
      }
      return base + "s";
    }

    function conjugateSpanish(pronoun: string) {
      switch(pronoun) {
        case "I":
          return {
            subjectES: "Yo",
            pres: rootES + "o",
            presCont: `estoy ${rootES}${endingAndoIendo}`,
            past: rootES + (endsWithAr ? "é" : "í"),
            pastCont: `estaba ${rootES}${endingAndoIendo}`,
            presPerf: `he ${rootES}${endingAdoIdo}`,
            presPerfCont: `he estado ${rootES}${endingAndoIendo}`,
            pastPerf: `había ${rootES}${endingAdoIdo}`,
            pastPerfCont: `había estado ${rootES}${endingAndoIendo}`,
            fut: rootES + (endsWithAr ? "aré" : "eré"),
            futCont: `estaré ${rootES}${endingAndoIendo}`,
            futPerf: `habré ${rootES}${endingAdoIdo}`,
            futPerfCont: `habré estado ${rootES}${endingAndoIendo}`
          };
        case "You":
          return {
            subjectES: "Tú",
            pres: rootES + (endsWithAr ? "as" : "es"),
            presCont: `estás ${rootES}${endingAndoIendo}`,
            past: rootES + (endsWithAr ? "aste" : "iste"),
            pastCont: `estabas ${rootES}${endingAndoIendo}`,
            presPerf: `has ${rootES}${endingAdoIdo}`,
            presPerfCont: `has estado ${rootES}${endingAndoIendo}`,
            pastPerf: `habías ${rootES}${endingAdoIdo}`,
            pastPerfCont: `habías estado ${rootES}${endingAndoIendo}`,
            fut: rootES + (endsWithAr ? "arás" : "erás"),
            futCont: `estarás ${rootES}${endingAndoIendo}`,
            futPerf: `habrás ${rootES}${endingAdoIdo}`,
            futPerfCont: `habrás estado ${rootES}${endingAndoIendo}`
          };
        case "He":
        case "She":
          const subj = pronoun === "He" ? "Él" : "Ella";
          return {
            subjectES: subj,
            pres: rootES + (endsWithAr ? "a" : "e"),
            presCont: `está ${rootES}${endingAndoIendo}`,
            past: rootES + (endsWithAr ? "ó" : "ió"),
            pastCont: `estaba ${rootES}${endingAndoIendo}`,
            presPerf: `ha ${rootES}${endingAdoIdo}`,
            presPerfCont: `ha estado ${rootES}${endingAndoIendo}`,
            pastPerf: `había ${rootES}${endingAdoIdo}`,
            pastPerfCont: `había estado ${rootES}${endingAndoIendo}`,
            fut: rootES + (endsWithAr ? "ará" : "erá"),
            futCont: `estará ${rootES}${endingAndoIendo}`,
            futPerf: `habrá ${rootES}${endingAdoIdo}`,
            futPerfCont: `habrá estado ${rootES}${endingAndoIendo}`
          };
        case "We":
          return {
            subjectES: "Nosotros",
            pres: rootES + (endsWithAr ? "amos" : "emos"),
            presCont: `estamos ${rootES}${endingAndoIendo}`,
            past: rootES + (endsWithAr ? "amos" : "imos"),
            pastCont: `estábamos ${rootES}${endingAndoIendo}`,
            presPerf: `hemos ${rootES}${endingAdoIdo}`,
            presPerfCont: `hemos estado ${rootES}${endingAndoIendo}`,
            pastPerf: `habíamos ${rootES}${endingAdoIdo}`,
            pastPerfCont: `habíamos estado ${rootES}${endingAndoIendo}`,
            fut: rootES + (endsWithAr ? "aremos" : "eremos"),
            futCont: `estaremos ${rootES}${endingAndoIendo}`,
            futPerf: `habremos ${rootES}${endingAdoIdo}`,
            futPerfCont: `habremos estado ${rootES}${endingAndoIendo}`
          };
        case "They":
        default:
          return {
            subjectES: "Ellos",
            pres: rootES + (endsWithAr ? "an" : "en"),
            presCont: `están ${rootES}${endingAndoIendo}`,
            past: rootES + (endsWithAr ? "aron" : "ieron"),
            pastCont: `estaban ${rootES}${endingAndoIendo}`,
            presPerf: `han ${rootES}${endingAdoIdo}`,
            presPerfCont: `han estado ${rootES}${endingAndoIendo}`,
            pastPerf: `habían ${rootES}${endingAdoIdo}`,
            pastPerfCont: `habían estado ${rootES}${endingAndoIendo}`,
            fut: rootES + (endsWithAr ? "arán" : "erán"),
            futCont: `estarán ${rootES}${endingAndoIendo}`,
            futPerf: `habrán ${rootES}${endingAdoIdo}`,
            futPerfCont: `habrán estado ${rootES}${endingAndoIendo}`
          };
      }
    }

    const tensesData = [
      {
        tenseId: "simple-present",
        tenseNameEN: "SIMPLE PRESENT",
        tenseNameES: "Presente Simple",
        buildEN: (p: string) => {
          const v = (p === "He" || p === "She") ? getPresentSimpleVerb(baseEN) : baseEN;
          return `${p} ${v}`;
        },
        buildES: (c: any) => `${c.subjectES} ${c.pres}`,
        pronunciationTip: `Pronunciación estándar y clara del verbo "${baseEN}".`
      },
      {
        tenseId: "present-continuous",
        tenseNameEN: "PRESENT CONTINUOUS",
        tenseNameES: "Presente Continuo",
        buildEN: (p: string) => {
          const be = p === "I" ? "am" : (p === "He" || p === "She") ? "is" : "are";
          return `${p} ${be} ${ingEN}`;
        },
        buildES: (c: any) => `${c.subjectES} ${c.presCont}`,
        pronunciationTip: `Enlaza el pronombre con el verbo auxiliar y '${ingEN}'.`
      },
      {
        tenseId: "simple-past",
        tenseNameEN: "SIMPLE PAST",
        tenseNameES: "Pasado Simple",
        buildEN: (p: string) => `${p} ${pastEN}`,
        buildES: (c: any) => `${c.subjectES} ${c.past}`,
        pronunciationTip: `La terminación de "${pastEN}" es clave para el pasado.`
      },
      {
        tenseId: "past-continuous",
        tenseNameEN: "PAST CONTINUOUS",
        tenseNameES: "Pasado Continuo",
        buildEN: (p: string) => {
          const be = (p === "I" || p === "He" || p === "She") ? "was" : "were";
          return `${p} ${be} ${ingEN}`;
        },
        buildES: (c: any) => `${c.subjectES} ${c.pastCont}`,
        pronunciationTip: `Suave articulación del auxiliar pasado seguida de '${ingEN}'.`
      },
      {
        tenseId: "present-perfect",
        tenseNameEN: "PRESENT PERFECT",
        tenseNameES: "Presente Perfecto",
        buildEN: (p: string) => {
          const hv = (p === "He" || p === "She") ? "has" : "have";
          return `${p} ${hv} ${partEN}`;
        },
        buildES: (c: any) => `${c.subjectES} ${c.presPerf}`,
        pronunciationTip: `Sopla suavemente al pronunciar el auxiliar de presente perfecto.`
      },
      {
        tenseId: "present-perfect-continuous",
        tenseNameEN: "PRESENT PERFECT CONTINUOUS",
        tenseNameES: "Presente Perfecto Continuo",
        buildEN: (p: string) => {
          const hv = (p === "He" || p === "She") ? "has" : "have";
          return `${p} ${hv} been ${ingEN}`;
        },
        buildES: (c: any) => `${c.subjectES} ${c.presPerfCont}`,
        pronunciationTip: `La palabra 'been' suena corta, parecida a 'bin'.`
      },
      {
        tenseId: "past-perfect",
        tenseNameEN: "PAST PERFECT",
        tenseNameES: "Pasado Perfecto",
        buildEN: (p: string) => `${p} had ${partEN}`,
        buildES: (c: any) => `${c.subjectES} ${c.pastPerf}`,
        pronunciationTip: `Une fluidamente 'had' con '${partEN}'.`
      },
      {
        tenseId: "past-perfect-continuous",
        tenseNameEN: "PAST PERFECT CONTINUOUS",
        tenseNameES: "Pasado Perfecto Continuo",
        buildEN: (p: string) => `${p} had been ${ingEN}`,
        buildES: (c: any) => `${c.subjectES} ${c.pastPerfCont}`,
        pronunciationTip: `Une las palabras auxiliares para lograr fluidez.`
      },
      {
        tenseId: "simple-future",
        tenseNameEN: "SIMPLE FUTURE",
        tenseNameES: "Futuro Simple",
        buildEN: (p: string) => `${p} will ${baseEN}`,
        buildES: (c: any) => `${c.subjectES} ${c.fut}`,
        pronunciationTip: `Combina el pronombre con el modal 'will' de forma limpia.`
      },
      {
        tenseId: "future-continuous",
        tenseNameEN: "FUTURE CONTINUOUS",
        tenseNameES: "Futuro Continuo",
        buildEN: (p: string) => `${p} will be ${ingEN}`,
        buildES: (c: any) => `${c.subjectES} ${c.futCont}`,
        pronunciationTip: `Une 'will be' como si fuera una sola palabra.`
      },
      {
        tenseId: "future-perfect",
        tenseNameEN: "FUTURE PERFECT",
        tenseNameES: "Futuro Perfecto",
        buildEN: (p: string) => `${p} will have ${partEN}`,
        buildES: (c: any) => `${c.subjectES} ${c.futPerf}`,
        pronunciationTip: `Presta atención al final de la palabra '${partEN}'.`
      },
      {
        tenseId: "future-perfect-continuous",
        tenseNameEN: "FUTURE PERFECT CONTINUOUS",
        tenseNameES: "Futuro Perfecto Continuo",
        buildEN: (p: string) => `${p} will have been ${ingEN}`,
        buildES: (c: any) => `${c.subjectES} ${c.futPerfCont}`,
        pronunciationTip: `Expresa esta oración en un solo flujo de aire.`
      }
    ];

    return tensesData.map((t, idx) => {
      const p = subjects[idx];
      const conj = conjugateSpanish(p);
      return {
        tenseId: t.tenseId,
        tenseNameEN: t.tenseNameEN,
        tenseNameES: t.tenseNameES,
        sentence: t.buildEN(p),
        translation: t.buildES(conj),
        pronunciationTip: t.pronunciationTip
      };
    });
  }

  // Generate 12 tenses for a new verb using Gemini API or Fallback
  app.post("/api/generate-tenses", async (req, res) => {
    try {
      const { inputText, difficulty } = req.body;

      if (!inputText || !inputText.trim()) {
        return res.status(400).json({
          error: "BAD_REQUEST",
          message: "Falta el parámetro obligatorio: inputText.",
        });
      }

      const inputClean = inputText.trim();

      // Dictionary of common verbs for robust local fallback when API key is missing
      const fallbackDict: { [key: string]: { en: string; es: string; diff: "Básico" | "Intermedio" | "Avanzado" } } = {
        "hablar": { en: "speak", es: "Hablar", diff: "Básico" },
        "speak": { en: "speak", es: "Hablar", diff: "Básico" },
        "cantar": { en: "sing", es: "Cantar", diff: "Básico" },
        "sing": { en: "sing", es: "Cantar", diff: "Básico" },
        "bailar": { en: "dance", es: "Bailar", diff: "Básico" },
        "dance": { en: "dance", es: "Bailar", diff: "Básico" },
        "correr": { en: "run", es: "Correr", diff: "Básico" },
        "run": { en: "run", es: "Correr", diff: "Básico" },
        "caminar": { en: "walk", es: "Caminar", diff: "Básico" },
        "walk": { en: "walk", es: "Caminar", diff: "Básico" },
        "comer": { en: "eat", es: "Comer", diff: "Básico" },
        "eat": { en: "eat", es: "Comer", diff: "Básico" },
        "beber": { en: "drink", es: "Beber", diff: "Básico" },
        "drink": { en: "drink", es: "Beber", diff: "Básico" },
        "dormir": { en: "sleep", es: "Dormir", diff: "Intermedio" },
        "sleep": { en: "sleep", es: "Dormir", diff: "Intermedio" },
        "escribir": { en: "write", es: "Escribir", diff: "Básico" },
        "write": { en: "write", es: "Escribir", diff: "Básico" },
        "leer": { en: "read", es: "Leer", diff: "Básico" },
        "read": { en: "read", es: "Leer", diff: "Básico" },
        "cocinar": { en: "cook", es: "Cocinar", diff: "Básico" },
        "cook": { en: "cook", es: "Cocinar", diff: "Básico" },
        "estudiar": { en: "study", es: "Estudiar", diff: "Básico" },
        "study": { en: "study", es: "Estudiar", diff: "Básico" },
        "jugar": { en: "play", es: "Jugar", diff: "Básico" },
        "play": { en: "play", es: "Jugar", diff: "Básico" },
        "ver": { en: "see", es: "Ver", diff: "Básico" },
        "see": { en: "see", es: "Ver", diff: "Básico" },
        "escuchar": { en: "listen", es: "Escuchar", diff: "Básico" },
        "listen": { en: "listen", es: "Escuchar", diff: "Básico" },
        "pensar": { en: "think", es: "Pensar", diff: "Intermedio" },
        "think": { en: "think", es: "Pensar", diff: "Intermedio" },
        "hacer": { en: "do", es: "Hacer", diff: "Básico" },
        "do": { en: "do", es: "Hacer", diff: "Básico" },
        "ir": { en: "go", es: "Ir", diff: "Básico" },
        "go": { en: "go", es: "Ir", diff: "Básico" },
        "tomar": { en: "take", es: "Tomar", diff: "Básico" },
        "take": { en: "take", es: "Tomar", diff: "Básico" },
        "amar": { en: "love", es: "Amar", diff: "Básico" },
        "love": { en: "love", es: "Amar", diff: "Básico" },
        "querer": { en: "want", es: "Querer", diff: "Básico" },
        "want": { en: "want", es: "Querer", diff: "Básico" },
        "aprender": { en: "learn", es: "Aprender", diff: "Intermedio" },
        "learn": { en: "learn", es: "Aprender", diff: "Intermedio" },
        "enseñar": { en: "teach", es: "Enseñar", diff: "Intermedio" },
        "teach": { en: "teach", es: "Enseñar", diff: "Intermedio" },
        "abrir": { en: "open", es: "Abrir", diff: "Básico" },
        "open": { en: "open", es: "Abrir", diff: "Básico" },
        "cerrar": { en: "close", es: "Cerrar", diff: "Básico" },
        "close": { en: "close", es: "Cerrar", diff: "Básico" },
        "comprar": { en: "buy", es: "Comprar", diff: "Básico" },
        "buy": { en: "buy", es: "Comprar", diff: "Básico" },
        "vender": { en: "sell", es: "Vender", diff: "Intermedio" },
        "sell": { en: "sell", es: "Vender", diff: "Intermedio" },
        "viajar": { en: "travel", es: "Viajar", diff: "Intermedio" },
        "travel": { en: "travel", es: "Viajar", diff: "Intermedio" },
        "trabajar": { en: "work", es: "Trabajar", diff: "Básico" },
        "work": { en: "work", es: "Trabajar", diff: "Básico" },
        "montar": { en: "ride", es: "Montar", diff: "Intermedio" },
        "ride": { en: "ride", es: "Montar", diff: "Intermedio" },
        "manejar": { en: "drive", es: "Manejar", diff: "Básico" },
        "drive": { en: "drive", es: "Manejar", diff: "Básico" },
      };

      const keyLower = inputClean.toLowerCase().replace(/^to\s+/i, "");
      let resolvedEN = inputClean;
      let resolvedES = inputClean;
      let resolvedDiff: "Básico" | "Intermedio" | "Avanzado" = difficulty || "Básico";

      if (fallbackDict[keyLower]) {
        resolvedEN = fallbackDict[keyLower].en;
        resolvedES = fallbackDict[keyLower].es;
        if (!difficulty) {
          resolvedDiff = fallbackDict[keyLower].diff;
        }
      } else {
        // We cannot reliably guess translations for unknown words.
        resolvedEN = inputClean;
        resolvedES = inputClean;
      }

      // If GEMINI_API_KEY is not defined, immediately use highly robust fallback tenses
      const apiKey = req.headers["x-gemini-api-key"] || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // If we don't know the exact translation, prevent Spanglish translations completely
        if (!fallbackDict[keyLower]) {
          return res.status(400).json({
            error: "GEMINI_API_KEY_MISSING",
            message: `Para traducir palabras nuevas como "${inputClean}" correctamente al inglés americano, necesitas configurar tu API Key de Gemini en el botón de ajustes.`
          });
        }
        console.log("No GEMINI_API_KEY found, using robust fallback generator.");
        const fallbackSentences = generateFallbackTenses(resolvedEN, resolvedES);
        return res.json({
          verbEN: resolvedEN,
          verbES: resolvedES,
          difficulty: resolvedDiff,
          sentences: fallbackSentences
        });
      }

      const systemInstruction = `Eres un experto lingüista y profesor de inglés para hispanohablantes. 
Tu tarea es tomar una entrada en texto (que puede ser un verbo, palabra o frase corta en inglés o español), analizarla, determinar su infinitivo o forma base correcta en inglés y su traducción correcta al español, determinar su nivel de dificultad ("Básico", "Intermedio" o "Avanzado"), y generar una lista de EXACTAMENTE 12 oraciones de ejemplo (una para cada uno de los 12 tiempos verbales de la gramática inglesa) usando esa palabra/verbo de forma natural.

Reglas importantes:
- La entrada puede estar en inglés o español. Debes traducirla correctamente.
- Determina la forma infinitiva del verbo en inglés para el campo "verbEN" (ej: si escriben "hablar", el verbEN es "Speak" o "To speak").
- Determina la traducción correcta para el campo "verbES" (ej: "Hablar").
- Si el usuario especificó una dificultad, usa esa, sino selecciona de manera inteligente ("Básico", "Intermedio" o "Avanzado").
- Distribuye aleatoria y variadamente diferentes sujetos (I, you, he, she, we, they) entre las 12 oraciones para que la práctica sea rica y abarque todas las personas gramaticales.
- Las oraciones deben ser cortas, claras, gramaticalmente correctas y apropiadas para practicar pronunciación.
- Para cada oración, proporciona una traducción exacta y natural al español, así como un consejo fonético corto de gran utilidad escrito en español para el participante.`;

      const prompt = `Analiza y genera los 12 tiempos verbales para la siguiente entrada: "${inputClean}".
Asegúrate de incluir exactamente los siguientes 12 tiempos en el orden estándar:
1. SIMPLE PRESENT (Presente Simple)
2. PRESENT CONTINUOUS (Presente Continuo)
3. SIMPLE PAST (Pasado Simple)
4. PAST CONTINUOUS (Pasado Continuo)
5. PRESENT PERFECT (Presente Perfecto)
6. PRESENT PERFECT CONTINUOUS (Presente Perfecto Continuo)
7. PAST PERFECT (Pasado Perfecto)
8. PAST PERFECT CONTINUOUS (Pasado Perfecto Continuo)
9. SIMPLE FUTURE (Futuro Simple)
10. FUTURE CONTINUOUS (Futuro Continuo)
11. FUTURE PERFECT (Futuro Perfecto)
12. FUTURE PERFECT CONTINUOUS (Futuro Perfecto Continuo)

Dificultad preferida (si se proporcionó): "${difficulty || 'auto'}".
Distribuye aleatoria y variadamente diferentes sujetos (I, you, he, she, we, they) entre las 12 oraciones para que la práctica sea dinámica y abarque todos los pronombres.`;

      const responseSchema = {
        type: "OBJECT",
        properties: {
          verbEN: { type: "STRING", description: "La forma base en inglés del verbo/palabra de entrada. Ej: 'Speak' o 'To speak'." },
          verbES: { type: "STRING", description: "La traducción de la forma base al español. Ej: 'Hablar'." },
          difficulty: { type: "STRING", description: "La dificultad determinada: 'Básico', 'Intermedio' o 'Avanzado'." },
          sentences: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                tenseId: { 
                  type: "STRING", 
                  description: "Identificador único de tiempo verbal en minúsculas con guiones." 
                },
                tenseNameEN: { type: "STRING", description: "Nombre del tiempo verbal en inglés en mayúsculas." },
                tenseNameES: { type: "STRING", description: "Nombre del tiempo verbal en español." },
                sentence: { type: "STRING", description: "La oración completa en inglés." },
                translation: { type: "STRING", description: "Traducción exacta de la oración al español." },
                pronunciationTip: { type: "STRING", description: "Un consejo práctico de pronunciación fonética simplificada en español." }
              },
              required: ["tenseId", "tenseNameEN", "tenseNameES", "sentence", "translation", "pronunciationTip"],
            },
            description: "Lista de exactamente 12 tiempos verbales principales en inglés."
          }
        },
        required: ["verbEN", "verbES", "difficulty", "sentences"]
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
      const result = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": (apiKey as string).trim()
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema,
          }
        })
      });

      if (!result.ok) {
        const errText = await result.text();
        throw new Error(`Status ${result.status}: ${errText}`);
      }

      const data = await result.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error("No se obtuvo respuesta del generador de oraciones.");
      }

      const resultJSON = JSON.parse(responseText.trim());
      return res.json(resultJSON);

    } catch (error: any) {
      console.error("Error generating tenses with Gemini:", error);
      return res.status(500).json({
        error: "GENERATION_FAILED",
        message: "Error de IA: Verifica que la API Key que configuraste sea válida (usualmente empieza con AIzaSy...) y tengas conexión. Detalle: " + (error.message || "Desconocido"),
      });
    }
  });

  // Serve static assets in production, otherwise use Vite middleware in development
  const distPath = path.join(process.cwd(), "dist");
  const isProduction = process.env.NODE_ENV === "production" || !fs.existsSync(path.join(process.cwd(), "node_modules/vite"));

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server listando en http://0.0.0.0:${PORT}`);
  });
}

startServer();
