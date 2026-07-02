import { DetailWord, PronunciationResult } from "../types";
import { Check, X, Star } from "lucide-react";
import { motion } from "motion/react";

interface PronunciationDetailsProps {
  result: PronunciationResult;
  expectedSentence: string;
}

function ConfettiParticles() {
  const colors = ["#2dd4bf", "#38bdf8", "#fbbf24", "#f43f5e", "#a855f7"];
  const particles = Array.from({ length: 45 }).map((_, i) => ({
    id: i,
    color: colors[i % colors.length],
    size: Math.random() * 8 + 6,
    x: Math.random() * 320 - 160,
    y: Math.random() * -300 - 80,
    rotate: Math.random() * 720,
    duration: Math.random() * 1.4 + 1.0,
    delay: Math.random() * 0.15
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 150, rotate: 0, scale: 1, opacity: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            rotate: p.rotate,
            scale: 0.1,
            opacity: 0
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut"
          }}
          style={{
            position: "absolute",
            left: "50%",
            top: "40%",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "3px",
            boxShadow: `0 0 10px ${p.color}`
          }}
        />
      ))}
    </div>
  );
}

export function PronunciationDetails({ result, expectedSentence }: PronunciationDetailsProps) {
  const { accuracyScore, phoneticGuide, details } = result;

  // SVG circle calculations
  const radius = 46;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracyScore / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-teal-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]";
    if (score >= 60) return "text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]";
    return "text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.5)]";
  };

  const getCircleColor = (score: number) => {
    if (score >= 85) return "stroke-teal-400";
    if (score >= 60) return "stroke-amber-400";
    return "stroke-rose-400";
  };

  const getAccuracyLabel = (score: number) => {
    if (score >= 90) return "¡Nivel Dios! Pronunciación Perfecta";
    if (score >= 75) return "¡Buenísimo! Te entendí todo";
    if (score >= 50) return "¡Buen intento! Casi lo logras";
    return "¡No te rindas! Sigue practicando";
  };

  // Determine stars count
  const starsCount = accuracyScore >= 90 ? 3 : accuracyScore >= 70 ? 2 : accuracyScore >= 45 ? 1 : 0;

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { scale: 0.4, opacity: 0, y: 10 },
    show: { 
      scale: 1, 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15
      }
    }
  };

  return (
    <div className="space-y-6 text-center relative" id="pronunciation-details-card">
      {/* Confetti if high score */}
      {accuracyScore >= 85 && <ConfettiParticles />}

      {/* Star Badges */}
      <div className="flex justify-center items-center gap-1.5 pt-2 select-none" id="stars-row">
        {[1, 2, 3].map((starIdx) => {
          const isActive = starIdx <= starsCount;
          return (
            <motion.div
              key={starIdx}
              initial={{ scale: 0, rotate: -30 }}
              animate={isActive ? { scale: [0, 1.25, 1], rotate: 0 } : { scale: 1, opacity: 0.15 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 12,
                delay: starIdx * 0.15
              }}
              className="relative"
            >
              <Star 
                className={`w-7 h-7 ${
                  isActive 
                    ? "fill-amber-400 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" 
                    : "text-white/20 fill-white/5"
                }`} 
              />
            </motion.div>
          );
        })}
      </div>

      {/* Animated Circle Score */}
      <div className="flex flex-col items-center justify-center" id="score-circle-holder">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              className="stroke-white/5 fill-none"
              strokeWidth={strokeWidth}
            />
            {/* Animated Progress Ring */}
            <motion.circle
              cx="64"
              cy="64"
              r={radius}
              className={`fill-none ${getCircleColor(accuracyScore)}`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <span className={`text-3xl font-black font-display tracking-tight ${getScoreColor(accuracyScore)}`}>
              {accuracyScore}%
            </span>
            <span className="text-[8px] font-bold text-white/30 tracking-wider uppercase -mt-0.5">Precisión</span>
          </div>
        </div>

        <motion.p 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm font-black text-white mt-3 tracking-wide"
        >
          {getAccuracyLabel(accuracyScore)}
        </motion.p>
      </div>

      {/* Phonetic guide */}
      {phoneticGuide && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-teal-500/5 border border-teal-500/10 py-2 px-3.5 rounded-2xl inline-flex flex-col items-center justify-center min-w-[180px] shadow-lg shadow-teal-950/20" 
          id="phonetic-guide-box"
        >
          <span className="text-[8px] font-black text-teal-400 tracking-widest uppercase">Pronunciación Guía</span>
          <span className="text-base font-mono font-bold text-teal-300 tracking-wide mt-0.5">
            {phoneticGuide}
          </span>
        </motion.div>
      )}

      {/* Word highlights */}
      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left" id="word-highlights-container">
        <span className="text-[9px] font-black text-white/30 block tracking-widest uppercase mb-3 text-center">Tus palabras habladas</span>
        
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
    </div>
  );
}
