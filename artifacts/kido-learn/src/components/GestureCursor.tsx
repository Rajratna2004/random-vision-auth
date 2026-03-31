import { motion } from "framer-motion";
import type { GestureType } from "@/hooks/useGestureDetection";

interface GestureCursorProps {
  x: number;
  y: number;
  gesture: GestureType;
  visible: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
}

const gestureEmoji: Record<GestureType, string> = {
  pointing: "👆",
  open_palm: "✋",
  peace: "✌️",
  fist: "✊",
  thumbs_up: "👍",
  none: "",
};

const GestureCursor = ({ x, y, gesture, visible, containerRef }: GestureCursorProps) => {
  if (!visible || gesture === "none") return null;

  const container = containerRef?.current;
  const px = container ? x * container.clientWidth : x * window.innerWidth;
  const py = container ? y * container.clientHeight : y * window.innerHeight;

  return (
    <motion.div
      className="fixed z-50 pointer-events-none flex flex-col items-center"
      animate={{ left: px - 20, top: py - 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <span className="text-4xl drop-shadow-lg">{gestureEmoji[gesture]}</span>
      <span className="text-xs font-bold bg-white/90 rounded-full px-2 py-0.5 shadow text-gray-700 mt-1">
        {gesture}
      </span>
    </motion.div>
  );
};

export default GestureCursor;
