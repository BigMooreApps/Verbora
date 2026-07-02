import { DetailWord, PronunciationResult } from "../types";
import { Check, X, Award, Flame, ThumbsUp } from "lucide-react";
import { motion } from "motion/react";

interface PronunciationDetailsProps {
  result: PronunciationResult;
  expectedSentence: string;
}

export function PronunciationDetails({ result, expectedSentence }: PronunciationDetailsProps) {
  const { accuracyScore, feedback, phoneticGuide, details } = result;

  // SVG circle calculations
  const radius = 42;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracyScore / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-teal-400 drop-shadow-[0_0_12px_rgba(45,212,191,0.4)]";
    if (score >= 60) return "text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]";
    return "text-rose-400 drop-shadow-[0_0_12px_rgba(251,113,133,0.4)]";
  };

  const getCircleColor = (score: number) => {
    if (score >= 85) return "stroke-teal-400";
    if (score >= 60) return "stroke-amber-400";
    return "stroke-rose-400";
  };

  const getAccuracyLabel = (score: number) => {
    if (score >= 90) return "¡Impecable! Excelente pronunciación.";
    if (score >= 75) return "¡Muy bien! Comprensible y claro.";
    if (score >= 50) return "Aceptable, con algunos detalles.";
    return "Requiere práctica constante.";
  };

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { scale: 0.3, opacity: 0, y: 15 },
    show: { 
      scale: 1, 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 18
      }
    }
  };

  return (
    <div className="space-y-6 text-center" id="pronunciation-details-card">
      
      {/* Animated Circle Score */}
      <div className="flex flex-col items-center justify-center py-2" id="score-circle-holder">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              className="stroke-white/5 fill-none"
              strokeWidth={strokeWidth}
            />
            {/* Animated Progress Ring */}
            <motion.circle
              cx="56"
              cy="56"
              r={radius}
              className={`fill-none ${getCircleColor(accuracyScore)}`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <span className={`text-2xl font-black font-display ${getScoreColor(accuracyScore)}`}>
              {accuracyScore}%
            </span>
            <span className="text-[8px] font-bold text-white/40 tracking-wider uppercase -mt-0.5">Precisión</span>
          </div>
        </div>

        <motion.p 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sm font-bold text-white/90 mt-3"
        >
          {getAccuracyLabel(accuracyScore)}
        </motion.p>
      </div>

      {/* Phonetic guide */}
      {phoneticGuide && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-teal-500/5 border border-teal-500/10 py-2.5 px-4 rounded-2xl shadow-inner inline-flex flex-col items-center justify-center min-w-[200px]" 
          id="phonetic-guide-box"
        >
          <span className="text-[8px] font-black text-teal-400 tracking-widest uppercase">Guía Fonética Simplificada</span>
          <span className="text-base font-mono font-bold text-teal-300 tracking-wide mt-1">
            {phoneticGuide}
          </span>
        </motion.div>
      )}

      {/* Word highlights */}
      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left" id="word-highlights-container">
        <span className="text-[9px] font-black text-white/40 block tracking-widest uppercase mb-3 text-center">Análisis de la Frase</span>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-wrap gap-2.5 items-center justify-center py-1" 
          id="words-highlight-row"
        >
          {details && details.length > 0 ? (
            details.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                className={`px-3 py-1.5 rounded-full border text-xs font-extrabold flex items-center gap-1 cursor-pointer select-none transition-all ${
                  item.matched
                    ? "bg-teal-500/10 text-teal-300 border-teal-500/20 shadow-[0_2px_8px_rgba(45,212,191,0.08)]"
                    : "bg-rose-500/10 text-rose-300 border-rose-500/20 shadow-[0_2px_8px_rgba(244,63,94,0.08)]"
                }`}
              >
                {item.word}
                {item.matched ? (
                  <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
              </motion.div>
            ))
          ) : (
            expectedSentence.split(" ").map((word, index) => (
              <motion.span
                key={index}
                variants={itemVariants}
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 rounded-full text-xs font-semibold"
              >
                {word}
              </motion.span>
            ))
          )}
        </motion.div>

        {/* Word breakdown list comments */}
        {details && details.some(d => !d.matched && d.comment) && (
          <div className="mt-4 border-t border-white/5 pt-3 space-y-1.5" id="breakdown-comments-box">
            {details.map((item, idx) => {
              if (!item.matched && item.comment) {
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={idx} 
                    className="flex gap-2 text-xs bg-rose-500/5 p-2 rounded-xl border border-rose-500/10"
                  >
                    <span className="font-extrabold text-rose-300 shrink-0 font-display">"{item.word}":</span>
                    <span className="text-white/70">{item.comment}</span>
                  </motion.div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      {/* Simplified Coach Feedback */}
      {feedback && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl text-left" 
          id="coach-feedback-box"
        >
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-teal-500/10 text-teal-300 rounded-xl shrink-0">
              {accuracyScore >= 80 ? (
                <Award className="w-4 h-4" />
              ) : (
                <ThumbsUp className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="text-[9px] font-black text-teal-400 tracking-widest block uppercase">Tip del Tutor</span>
              <p className="text-xs text-white/80 mt-1.5 leading-relaxed">
                {feedback.length > 160 ? `${feedback.slice(0, 160)}...` : feedback}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
