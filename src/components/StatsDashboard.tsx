import { UserStats } from "../types";
import { Flame, Star, Target } from "lucide-react";
import { motion } from "motion/react";

interface StatsDashboardProps {
  stats: UserStats;
}

export function StatsDashboard({ stats }: StatsDashboardProps) {
  // Safe calculation for accuracy
  const accuracyPercent = stats.totalAttempts > 0 
    ? Math.round((stats.successfulAttempts / stats.totalAttempts) * 100) 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-xl rounded-2xl p-2.5 sm:p-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] mt-2 sm:mt-6 shrink-0"
    >
      <div className="grid grid-cols-3 divide-x divide-white/10 text-center" id="stats-grid">
        {/* Streak Stats */}
        <div className="flex flex-col items-center justify-center px-1" id="stat-streak">
          <div className="flex items-center gap-1">
            <motion.div
              animate={{ 
                scale: [1, 1.15, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2.5,
                ease: "easeInOut"
              }}
              className="text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.3)]"
            >
              <Flame className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 fill-current" />
            </motion.div>
            <span className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest">Racha</span>
          </div>
          <span className="text-sm sm:text-lg font-bold text-white mt-1 sm:mt-1.5 font-display">
            {stats.streak} {stats.streak === 1 ? "día" : "días"}
          </span>
        </div>

        {/* XP Stats */}
        <div className="flex flex-col items-center justify-center px-1" id="stat-xp">
          <div className="flex items-center gap-1">
            <motion.div
              animate={{ 
                rotate: 360 
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 12,
                ease: "linear"
              }}
              className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
            >
              <Star className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 fill-current" />
            </motion.div>
            <span className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest">Puntos</span>
          </div>
          <span className="text-sm sm:text-lg font-bold text-white mt-1 sm:mt-1.5 font-display">
            {stats.xp.toLocaleString()}
          </span>
        </div>

        {/* Accuracy Stats */}
        <div className="flex flex-col items-center justify-center px-1" id="stat-accuracy">
          <div className="flex items-center gap-1">
            <div className="text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.3)]">
              <Target className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest">Precisión</span>
          </div>
          <span className="text-sm sm:text-lg font-bold text-white mt-1 sm:mt-1.5 font-display">
            {stats.totalAttempts > 0 ? `${accuracyPercent}%` : "—"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

