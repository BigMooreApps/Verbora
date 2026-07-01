import { motion } from "motion/react";
import { Clock, HelpCircle, Lightbulb, Sparkles, BookOpen } from "lucide-react";

interface TenseVisualGuideProps {
  tenseId: string;
  tenseNameEN: string;
  tenseNameES: string;
  pronunciationTip?: string;
}

interface TenseMetaData {
  description: string;
  formula: { label: string; color: string }[];
  example: string;
  timelineType: 
    | "past-point" 
    | "past-continuous" 
    | "past-past" 
    | "past-to-present" 
    | "present-point" 
    | "present-continuous" 
    | "future-point" 
    | "future-continuous" 
    | "future-perfect"
    | "complex";
}

const TENSE_METADATA_MAP: Record<string, TenseMetaData> = {
  "simple-present": {
    description: "Hábitos, rutinas diarias o verdades generales que siempre ocurren.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "Verbo (Forma Base)", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
    ],
    example: "I work every day.",
    timelineType: "present-point"
  },
  "present-continuous": {
    description: "Acciones temporales que están ocurriendo ahora mismo, en este instante.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "am / is / are", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "Verbo + ING", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
    ],
    example: "I am working right now.",
    timelineType: "present-continuous"
  },
  "simple-past": {
    description: "Acciones que comenzaron y terminaron en un momento específico del pasado.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "Verbo -ED / Irregular", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" }
    ],
    example: "I worked yesterday.",
    timelineType: "past-point"
  },
  "past-continuous": {
    description: "Acciones continuas que estaban ocurriendo en el pasado cuando algo las interrumpió.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "was / were", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "Verbo + ING", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
    ],
    example: "I was working when you called.",
    timelineType: "past-continuous"
  },
  "present-perfect": {
    description: "Acciones del pasado que tienen una conexión, resultado o importancia en el presente.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "have / has", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "Verbo (Participio)", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" }
    ],
    example: "I have worked here for years.",
    timelineType: "past-to-present"
  },
  "present-perfect-continuous": {
    description: "Acciones que comenzaron en el pasado y continúan activas o acaban de terminar.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "have / has", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "been", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
      { label: "Verbo + ING", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
    ],
    example: "I have been working all morning.",
    timelineType: "past-to-present"
  },
  "past-perfect": {
    description: "El pasado del pasado: una acción completada antes de otra acción en el pasado.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "had", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "Verbo (Participio)", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" }
    ],
    example: "I had worked before they arrived.",
    timelineType: "past-past"
  },
  "past-perfect-continuous": {
    description: "Acción continua que se estuvo realizando en el pasado antes de otro evento pasado.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "had", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "been", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
      { label: "Verbo + ING", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
    ],
    example: "I had been working for hours.",
    timelineType: "past-past"
  },
  "simple-future": {
    description: "Planes futuros, predicciones, promesas o decisiones tomadas en el momento.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "will", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "Verbo (Forma Base)", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
    ],
    example: "I will work tomorrow.",
    timelineType: "future-point"
  },
  "future-continuous": {
    description: "Acciones continuas que estarán ocurriendo en un punto específico del futuro.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "will be", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "Verbo + ING", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
    ],
    example: "I will be working at noon.",
    timelineType: "future-continuous"
  },
  "future-perfect": {
    description: "Acciones que ya habrán finalizado antes de un límite de tiempo en el futuro.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "will have", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "Verbo (Participio)", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" }
    ],
    example: "I will have worked by Monday.",
    timelineType: "future-perfect"
  },
  "future-perfect-continuous": {
    description: "Acción continua que se habrá estado realizando hasta un momento determinado del futuro.",
    formula: [
      { label: "Sujeto", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
      { label: "will have been", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      { label: "Verbo + ING", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
    ],
    example: "I will have been working for ten hours.",
    timelineType: "future-perfect"
  }
};

export function TenseVisualGuide({
  tenseId,
  tenseNameEN,
  tenseNameES,
  pronunciationTip
}: TenseVisualGuideProps) {
  // Normalize key to lower case
  const key = tenseId.toLowerCase().replace(/_/g, "-");
  const meta = TENSE_METADATA_MAP[key] || {
    description: "Tiempo verbal de la gramática inglesa.",
    formula: [{ label: "Fórmula de Oración", color: "bg-white/10 text-white/80" }],
    example: "",
    timelineType: "complex" as const
  };

  // Helper to render the graphical timeline
  const renderTimelineGraphic = () => {
    const type = meta.timelineType;
    return (
      <div className="w-full bg-[#161c2a]/90 rounded-xl p-3 border border-white/5 relative overflow-hidden" id="timeline-box">
        {/* Three zones labels */}
        <div className="grid grid-cols-3 text-[10px] font-black text-center text-white/35 uppercase tracking-wider mb-2">
          <span>Pasado</span>
          <span className="text-teal-400">Presente</span>
          <span>Futuro</span>
        </div>

        {/* Timeline bar */}
        <div className="relative h-1.5 w-full bg-white/10 rounded-full flex items-center">
          
          {/* Middle Present line marker */}
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-3 bg-teal-400/50 z-10" />

          {/* Graphical overlay based on tense types */}
          {type === "present-point" && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute left-1/2 -translate-x-1/2 w-4.5 h-4.5 rounded-full bg-teal-400 border border-teal-200 shadow-lg shadow-teal-500/50 z-20 flex items-center justify-center"
            >
              <div className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
            </motion.div>
          )}

          {type === "present-continuous" && (
            <div className="absolute left-[40%] right-[40%] h-3 bg-gradient-to-r from-teal-500/30 via-teal-400 to-teal-500/30 rounded-full z-20 flex items-center justify-center border border-teal-300/30">
              <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />
            </div>
          )}

          {type === "past-point" && (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="absolute left-[20%] w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-200 shadow z-20"
            />
          )}

          {type === "past-continuous" && (
            <div className="absolute left-[10%] right-[55%] h-2.5 bg-gradient-to-r from-amber-500/10 to-amber-500/40 border border-dashed border-amber-400/40 rounded-full z-20 flex items-center justify-between px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
            </div>
          )}

          {type === "past-past" && (
            <div className="absolute left-[10%] right-[60%] flex items-center justify-between z-20 w-1/3">
              <div className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-300 shadow" title="Acción anterior" />
              <div className="w-2 h-2 bg-white/20 rounded-full" />
              <div className="w-3 h-3 rounded-full bg-amber-400/60 border border-amber-200/40" title="Acción posterior" />
            </div>
          )}

          {type === "past-to-present" && (
            <div className="absolute left-[20%] right-1/2 h-2.5 bg-gradient-to-r from-teal-500/10 to-teal-400/40 border border-teal-400/30 rounded-l-full rounded-r-none z-20 flex items-center justify-between">
              <div className="w-2 h-2 rounded-full bg-teal-400/50" />
              <div className="flex-1 border-t-2 border-dotted border-teal-300/40 mx-1" />
              <div className="w-3.5 h-3.5 rounded-full bg-teal-400 border border-teal-200 shadow animate-pulse" />
            </div>
          )}

          {type === "future-point" && (
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="absolute right-[20%] w-3.5 h-3.5 rounded-full bg-sky-400 border border-sky-200 shadow z-20"
            />
          )}

          {type === "future-continuous" && (
            <div className="absolute left-[55%] right-[10%] h-2.5 bg-gradient-to-r from-sky-500/20 to-sky-400/50 border border-sky-400/40 rounded-full z-20 flex items-center justify-between px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
            </div>
          )}

          {type === "future-perfect" && (
            <div className="absolute left-1/2 right-[15%] h-2.5 bg-gradient-to-r from-sky-500/10 to-sky-400/30 border border-dashed border-sky-400/30 rounded-full z-20 flex items-center justify-between">
              <div className="w-2 h-2 rounded-full bg-teal-400/40" />
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border border-emerald-200 shadow" title="Acción completada" />
              <div className="w-2 h-2 bg-rose-500 rounded" title="Límite futuro" />
            </div>
          )}

          {type === "complex" && (
            <div className="absolute left-[15%] right-[15%] h-1 bg-gradient-to-r from-amber-400 via-teal-400 to-sky-400 rounded-full z-20" />
          )}

        </div>
        
        {/* Timeline description help */}
        <div className="flex justify-between items-center mt-2.5 text-[9px] text-white/40">
          <span className="italic">
            {type === "past-point" && "Punto único en el pasado"}
            {type === "past-continuous" && "Acción continua en el pasado"}
            {type === "past-past" && "Acción antes de otra acción pasada"}
            {type === "past-to-present" && "Conexión Pasado ➜ Presente"}
            {type === "present-point" && "Ocurre habitualmente ahora"}
            {type === "present-continuous" && "Ocurriendo en este instante"}
            {type === "future-point" && "Punto único en el futuro"}
            {type === "future-continuous" && "Acción continua en el futuro"}
            {type === "future-perfect" && "Completada antes de fecha límite"}
            {type === "complex" && "Línea temporal"}
          </span>
          <span className="font-bold text-white/60">Mapa Temporal de Acción</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-xl text-left" id="tense-graphic-guide">
      {/* Description */}
      <p className="text-[11px] sm:text-xs text-white/85 leading-relaxed font-normal">
        {meta.description}
      </p>

      {/* Graphical Timeline Section */}
      {renderTimelineGraphic()}

      {/* Visual Formula block */}
      <div className="space-y-1">
        <span className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-wider block">
          Fórmula Nemotécnica para Memorizar
        </span>
        <div className="flex flex-wrap items-center gap-1 bg-[#161c2a]/60 p-2 sm:p-2.5 rounded-xl border border-white/5">
          {meta.formula.map((part, index) => (
            <span key={index} className="flex items-center gap-1">
              <span className={`text-[10px] sm:text-[10.5px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border shadow-sm ${part.color}`}>
                {part.label}
              </span>
              {index < meta.formula.length - 1 && (
                <span className="text-white/40 text-[10px] sm:text-xs font-bold font-mono">+</span>
              )}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
