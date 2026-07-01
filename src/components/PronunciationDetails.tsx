import { DetailWord, PronunciationResult } from "../types";
import { Check, X, Info } from "lucide-react";
import { motion } from "motion/react";

interface PronunciationDetailsProps {
  result: PronunciationResult;
  expectedSentence: string;
}

export function PronunciationDetails({ result, expectedSentence }: PronunciationDetailsProps) {
  const { accuracyScore, feedback, phoneticGuide, details } = result;

  // Helper to color codes based on accuracy score
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-teal-300 bg-teal-500/10 border-teal-500/30";
    if (score >= 60) return "text-amber-300 bg-amber-500/10 border-amber-500/30";
    return "text-rose-300 bg-rose-500/10 border-rose-500/30";
  };

  const getAccuracyLabel = (score: number) => {
    if (score >= 90) return "¡Impecable! Tu sonido es excelente.";
    if (score >= 75) return "¡Muy bien! Se entiende claramente.";
    if (score >= 50) return "Aceptable, pero con ligeros detalles.";
    return "Requiere práctica. Revisa los consejos abajo.";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
      id="pronunciation-details-card"
    >
      {/* Score Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg" id="score-header-box">
        <div>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Puntaje de Precisión</div>
          <p className="text-sm font-medium text-white/80 mt-1">{getAccuracyLabel(accuracyScore)}</p>
        </div>
        <div className={`flex items-center justify-center font-bold text-xl h-14 w-14 rounded-full border-2 font-display ${getScoreColor(accuracyScore)}`}>
          {accuracyScore}%
        </div>
      </div>

      {/* Phonetic guide */}
      {phoneticGuide && (
        <div className="bg-teal-500/5 border border-teal-500/15 text-center p-3 rounded-xl" id="phonetic-guide-box">
          <span className="text-[10px] font-bold text-teal-400 block tracking-widest uppercase">Guía Fonética Simplificada (IPA)</span>
          <span className="text-lg font-mono font-bold text-teal-300 tracking-wide select-none mt-1 inline-block">
            {phoneticGuide}
          </span>
        </div>
      )}

      {/* Word highlights */}
      <div className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-sm" id="word-highlights-container">
        <span className="text-[10px] font-bold text-white/40 block tracking-widest uppercase mb-3">Análisis de la frase</span>
        
        <div className="flex flex-wrap gap-2.5 items-center justify-center py-2" id="words-highlight-row">
          {details && details.length > 0 ? (
            details.map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer select-none ${
                  item.matched
                    ? "bg-teal-500/10 text-teal-300 border-teal-500/20 hover:bg-teal-500/20"
                    : "bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
                }`}
              >
                {item.word}
                {item.matched ? (
                  <Check className="w-3 h-3 text-teal-400 shrink-0" />
                ) : (
                  <X className="w-3 h-3 text-rose-400 shrink-0" />
                )}
              </motion.div>
            ))
          ) : (
            // Fallback word parsing if details is empty
            expectedSentence.split(" ").map((word, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 rounded-full text-xs font-semibold"
              >
                {word}
              </span>
            ))
          )}
        </div>

        {/* Word breakdown list with tips if any element is wrong */}
        {details && details.some(d => !d.matched || d.comment) && (
          <div className="mt-4 border-t border-white/10 pt-3 space-y-2" id="breakdown-comments-box">
            <span className="text-[10px] font-bold text-white/40 block mb-2 uppercase tracking-wide">Pistas de mejora:</span>
            {details.map((item, idx) => {
              if (!item.matched && item.comment) {
                return (
                  <div key={idx} className="flex gap-2 text-xs bg-rose-500/5 p-2 rounded-lg border border-rose-500/15">
                    <span className="font-bold text-rose-300 shrink-0 font-display">"{item.word}":</span>
                    <span className="text-white/80">{item.comment}</span>
                  </div>
                );
              }
              if (item.comment) {
                return (
                  <div key={idx} className="flex gap-2 text-xs bg-white/5 p-2 rounded-lg border border-white/5">
                    <span className="font-bold text-white/80 shrink-0 font-display">"{item.word}":</span>
                    <span className="text-white/60">{item.comment}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      {/* Coach Feedback */}
      {feedback && (
        <div className="p-4 bg-teal-500/5 border border-teal-500/15 rounded-2xl shadow-lg" id="coach-feedback-box">
          <div className="flex items-start gap-3">
            <div className="p-1 px-1.5 bg-teal-500/20 text-teal-300 rounded-md shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-teal-300 tracking-widest block uppercase">Consejo del Profesor IA</span>
              <p className="text-sm text-white/80 mt-1.5 leading-relaxed whitespace-pre-line">
                {feedback}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

