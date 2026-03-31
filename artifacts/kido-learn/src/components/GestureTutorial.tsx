import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface GestureTutorialProps {
  onDismiss: () => void;
  gestures?: Array<{ emoji: string; label: string; description: string }>;
}

const DEFAULT_GESTURES = [
  { emoji: "☝️", label: "Point", description: "Draw or select items" },
  { emoji: "✌️", label: "Peace", description: "Change color" },
  { emoji: "✋", label: "Open Palm", description: "Clear canvas" },
  { emoji: "✊", label: "Fist", description: "Pause drawing" },
];

const GestureTutorial = ({ onDismiss, gestures = DEFAULT_GESTURES }: GestureTutorialProps) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-2 border-[#0DA2E7]/20 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          >
            <X size={20} />
          </button>

          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 text-center mb-2">
            🖐️ Hand Gestures
          </h2>
          <p className="text-gray-500 text-center text-sm mb-6">
            Use these hand signs to control the game!
          </p>

          <div className="grid grid-cols-2 gap-4">
            {gestures.map((g, i) => (
              <motion.div
                key={g.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-50 rounded-2xl p-4 text-center flex flex-col items-center gap-2"
              >
                <span className="text-5xl">{g.emoji}</span>
                <span className="font-bold text-gray-800 text-lg">{g.label}</span>
                <span className="text-xs text-gray-500">{g.description}</span>
              </motion.div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDismiss}
            className="mt-6 w-full text-white font-bold py-3.5 rounded-2xl text-base hover:opacity-90 transition-all shadow-md"
            style={{ background: "linear-gradient(135deg, #0DA2E7, #26d0ce)" }}
          >
            Got it! Let's go! 🚀
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GestureTutorial;
