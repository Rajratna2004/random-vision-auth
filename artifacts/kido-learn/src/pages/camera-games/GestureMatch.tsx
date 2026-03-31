import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useGestureDetection } from "@/hooks/useGestureDetection";
import GestureOverlay from "@/components/GestureOverlay";
import GestureCursor from "@/components/GestureCursor";
import GestureTutorial from "@/components/GestureTutorial";
import { playPop, playSuccess, playError } from "@/lib/sounds";

const CARD_EMOJIS = ["🌟", "🎈", "🍎", "🌈", "🦋", "🎵", "🚀", "🌸"];

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

function createCards(count: number): Card[] {
  const selected = CARD_EMOJIS.slice(0, count);
  const doubled = [...selected, ...selected];
  return doubled.sort(() => Math.random() - 0.5).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

const MEMORY_GESTURES = [
  { emoji: "☝️", label: "Point", description: "Move cursor over cards" },
  { emoji: "✌️", label: "Peace", description: "Flip a card" },
  { emoji: "✊", label: "Fist", description: "Pause" },
];

export default function GestureMatch({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [pairs, setPairs] = useState(4);
  const startTime = useRef(Date.now());
  const [showTutorial, setShowTutorial] = useState(false);
  const cardRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const lastGestureSelect = useRef(0);

  const gestureCallbackRef = useRef<((g: string) => void) | null>(null);
  const { videoRef, canvasRef, currentHand, isLoading, isReady, error, cameraActive, startGestureDetection, stopCamera } =
    useGestureDetection({ onGesture: (g) => gestureCallbackRef.current?.(g) });

  const resetGame = useCallback(() => {
    setCards(createCards(pairs));
    setFlippedIds([]);
    setMoves(0);
    startTime.current = Date.now();
  }, [pairs]);

  useEffect(() => { resetGame(); }, [resetGame]);

  const handleFlip = useCallback((id: number) => {
    setFlippedIds(prevFlipped => {
      if (prevFlipped.length >= 2) return prevFlipped;
      setCards(prevCards => {
        const card = prevCards.find(c => c.id === id);
        if (!card || card.flipped || card.matched) return prevCards;
        playPop();
        const newCards = prevCards.map(c => c.id === id ? { ...c, flipped: true } : c);
        const newFlipped = [...prevFlipped, id];
        if (newFlipped.length === 2) {
          setMoves(m => m + 1);
          const [a, b] = newFlipped.map(fid => newCards.find(c => c.id === fid)!);
          if (a.emoji === b.emoji) {
            playSuccess();
            setTimeout(() => {
              setCards(prev => prev.map(c => c.id === a.id || c.id === b.id ? { ...c, matched: true } : c));
              setFlippedIds([]);
            }, 500);
          } else {
            playError();
            setTimeout(() => {
              setCards(prev => prev.map(c => c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c));
              setFlippedIds([]);
            }, 800);
          }
        }
        return newCards;
      });
      return prevFlipped.length >= 2 ? prevFlipped : [...prevFlipped, id];
    });
  }, []);

  useEffect(() => {
    gestureCallbackRef.current = (g: string) => {
      if (g !== "peace") return;
      const now = Date.now();
      if (now - lastGestureSelect.current < 800) return;
      lastGestureSelect.current = now;
      const px = currentHand.x * window.innerWidth;
      const py = currentHand.y * window.innerHeight;
      cardRefs.current.forEach((el, cardId) => {
        const rect = el.getBoundingClientRect();
        if (px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom) {
          handleFlip(cardId);
        }
      });
    };
  }, [currentHand, handleFlip]);

  const handleToggleCamera = async () => {
    if (cameraActive) { stopCamera(); } else { setShowTutorial(true); }
  };

  const handleTutorialDismiss = async () => {
    setShowTutorial(false);
    await startGestureDetection();
  };

  const setCardRef = useCallback((id: number) => (el: HTMLButtonElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  const allMatched = cards.length > 0 && cards.every(c => c.matched);
  const cols = pairs <= 4 ? "grid-cols-4" : "grid-cols-4 md:grid-cols-6";

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onBack} className="p-2 rounded-full bg-muted">
          <ArrowLeft size={20} />
        </motion.button>
        <h2 className="text-xl font-display text-foreground">🧠 Memory Cards</h2>
        <div className="flex items-center gap-2 text-foreground font-bold text-sm">Moves: {moves}</div>
      </div>

      {cameraActive && (
        <div className="text-center mb-3">
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
            ☝️ Point at card • ✌️ Flip
          </span>
        </div>
      )}

      <div className="flex justify-center gap-2 mb-4">
        {[4, 6, 8].map(n => (
          <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => setPairs(n)}
            className={`kiddo-btn text-sm px-4 py-2 ${pairs === n ? "kiddo-gradient-sky text-white" : "bg-muted text-foreground"}`}>
            {n} Pairs
          </motion.button>
        ))}
      </div>

      {allMatched ? (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center py-8">
          <div className="text-6xl mb-3">🏆</div>
          <h2 className="text-2xl font-display text-green-600 mb-2">You Did It!</h2>
          <p className="text-lg text-muted-foreground mb-4">Completed in {moves} moves!</p>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={resetGame}
            className="kiddo-btn kiddo-gradient-candy text-white">
            <RotateCcw size={18} className="inline mr-2" /> Play Again!
          </motion.button>
        </motion.div>
      ) : (
        <div className={`grid ${cols} gap-2 md:gap-3`}>
          {cards.map(card => (
            <motion.button
              key={card.id}
              ref={setCardRef(card.id)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => handleFlip(card.id)}
              className={`aspect-square rounded-2xl text-3xl md:text-4xl flex items-center justify-center shadow-md transition-all duration-300 ${
                card.flipped || card.matched ? "bg-white border-2 border-[#0DA2E7]" : "kiddo-gradient-sky cursor-pointer"
              } ${card.matched ? "opacity-50" : ""}`}
            >
              {card.flipped || card.matched ? card.emoji : "❓"}
            </motion.button>
          ))}
        </div>
      )}

      <div className="text-center mt-4">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={resetGame}
          className="kiddo-btn bg-muted text-foreground text-sm">
          <RotateCcw size={14} className="inline mr-1" /> Restart
        </motion.button>
      </div>

      <GestureOverlay videoRef={videoRef} canvasRef={canvasRef} cameraActive={cameraActive}
        isLoading={isLoading} isReady={isReady} error={error} onToggleCamera={handleToggleCamera}
        gesture={currentHand.gesture}
      />
      <GestureCursor x={currentHand.x} y={currentHand.y} gesture={currentHand.gesture} visible={cameraActive} />

      {showTutorial && <GestureTutorial onDismiss={handleTutorialDismiss} gestures={MEMORY_GESTURES} />}
    </div>
  );
}
