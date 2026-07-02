import { useState, useRef, useEffect } from "react";
import { VerbExercise } from "../types";
import { 
  BookOpen, 
  Sparkles, 
  Plus, 
  Trash2, 
  X, 
  AlertCircle, 
  ChevronDown, 
  Check, 
  Search, 
  RefreshCw 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VerbSelectorProps {
  exercises: VerbExercise[];
  selectedVerbId: string;
  onSelectVerb: (verbId: string) => void;
  onAddVerb: (newVerb: VerbExercise) => void;
  onDeleteVerb: (verbId: string) => void;
}

export function VerbSelector({ 
  exercises, 
  selectedVerbId, 
  onSelectVerb, 
  onAddVerb, 
  onDeleteVerb 
}: VerbSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedVerb = exercises.find((item) => item.id === selectedVerbId) || exercises[0];

  const getDifficultyStyles = (diff: string) => {
    switch (diff) {
      case "Básico":
        return "bg-teal-500/10 text-teal-300 border-teal-500/20";
      case "Intermedio":
        return "bg-blue-500/10 text-blue-300 border-blue-500/20";
      case "Avanzado":
        return "bg-rose-500/10 text-rose-300 border-rose-500/20";
      default:
        return "bg-white/5 text-white/60 border-white/10";
    }
  };

  const capitalize = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const inputClean = inputText.trim();
    if (!inputClean) {
      setError("Por favor ingresa un verbo, palabra o frase corta.");
      return;
    }

    // Duplicate Check
    const cleanCompare = inputClean.toLowerCase().replace(/^to\s+/i, "");
    const isDuplicate = exercises.some((ex) => {
      const exEN = ex.verbEN.toLowerCase().replace(/^to\s+/i, "");
      const exES = ex.verbES.toLowerCase();
      return exEN === cleanCompare || exES === cleanCompare;
    });

    if (isDuplicate) {
      setError(`La palabra "${capitalize(inputClean.replace(/^(to\s+)/i, ""))}" ya existe en tu lista de prácticas.`);
      return;
    }

    setIsGenerating(true);

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
        throw new Error(errData.message || "No se pudo conectar con el servidor para la generación.");
      }

      const data = await response.json();
      if (!data.sentences || data.sentences.length === 0) {
        throw new Error("No se generó el conjunto de tiempos verbales correctamente.");
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

      onAddVerb(newVerb);
      
      // Reset form states
      setInputText("");
      setIsFormOpen(false);
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar o procesar con el servidor de IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredExercises = exercises.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.verbEN.toLowerCase().includes(query) ||
      item.verbES.toLowerCase().includes(query) ||
      item.difficulty.toLowerCase().includes(query)
    );
  });

  return (
    <div className="shrink-0" id="verb-selector-container">
      {/* Sleek, ultra-compact control bar */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-3 shadow-lg" id="word-control-bar">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-teal-400 shrink-0" />
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider hidden xs:inline">Verbo:</span>
            <span className="text-sm font-bold text-white truncate font-display">
              {selectedVerb?.verbEN?.replace(/^to\s+/i, "") || "Cargando..."}
            </span>
            <span className="text-[10px] text-white/50 truncate">
              ({selectedVerb?.verbES})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* SELECCIONAR (pequeño botón/icono) */}
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 hover:text-white transition-all flex items-center gap-1 cursor-pointer select-none"
            title="Seleccionar otra palabra"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-wider uppercase hidden sm:inline">Elegir</span>
          </button>

          {/* CREAR (pequeño botón/icono de suma) */}
          <button
            onClick={() => setIsFormOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 transition-all flex items-center gap-1 cursor-pointer select-none"
            title="Crear palabra con IA"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-wider uppercase hidden sm:inline">Crear</span>
          </button>
        </div>
      </div>

      {/* MODAL PARA SELECCIONAR PALABRA */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#131b2e] border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">Seleccionar Palabra</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-white/40 hover:text-white/80 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Header */}
              <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-[#172138]">
                <Search className="w-4 h-4 text-white/30 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar verbo o dificultad..."
                  className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none py-1"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-white/30 hover:text-white/70"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="max-h-[250px] sm:max-h-[320px] overflow-y-auto divide-y divide-white/5">
                {filteredExercises.length > 0 ? (
                  filteredExercises.map((item) => {
                    const isSelected = item.id === selectedVerbId;
                    const isDeletingThis = deletingId === item.id;
                    
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (!isDeletingThis) {
                            onSelectVerb(item.id);
                            setIsOpen(false);
                          }
                        }}
                        className={`p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer relative ${
                          isSelected ? "bg-teal-500/10 text-teal-300" : "text-white/80"
                        }`}
                      >
                        {/* Inline confirmation for deletion */}
                        <AnimatePresence>
                          {isDeletingThis && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-[#1e1e2d] px-4 flex items-center justify-between z-20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-xs font-bold text-rose-300">
                                ¿Seguro de eliminar "{item.verbEN?.replace(/^to\s+/i, "")}"?
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteVerb(item.id);
                                    setDeletingId(null);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Sí, eliminar
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingId(null);
                                  }}
                                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Left Info */}
                        <div className="min-w-0 flex-1 pr-4">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-white font-display">
                              {item.verbEN?.replace(/^to\s+/i, "")}
                            </span>
                            <span className="text-[10px] text-white/40">
                              ({item.verbES})
                            </span>
                          </div>
                          <span className="text-[9.5px] text-white/30 font-medium block">
                            {item.sentences?.length || 0} tiempos verbales
                          </span>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getDifficultyStyles(item.difficulty)}`}>
                            {item.difficulty}
                          </span>
                          
                          {item.isCustom && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(item.id);
                              }}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar palabra personalizada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isSelected && (
                            <Check className="w-4 h-4 text-teal-400 ml-1" />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-white/40 text-xs">
                    No se encontraron palabras que coincidan.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PARA CREAR NUEVA PALABRA CON IA */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isGenerating) setIsFormOpen(false);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#131b2e] border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-white tracking-wide">Crear Palabra con IA</h3>
                </div>
                <button
                  disabled={isGenerating}
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-white/40 hover:text-white/80 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <p className="text-xs text-white/60 leading-relaxed">
                  Escribe cualquier palabra o verbo en <strong>inglés o español</strong>. La IA generará automáticamente la traducción y <strong>los 12 tiempos verbales completos</strong> con consejos fonéticos personalizados.
                </p>
                
                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
                    Palabra, verbo o frase corta
                  </label>
                  <input
                    type="text"
                    disabled={isGenerating}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ej: cook, bailar, read, caminar..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 disabled:opacity-50"
                    autoFocus
                  />
                </div>


                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-teal-500/10 cursor-pointer disabled:opacity-60 flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Crear Práctica</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
