import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Loader2 } from "lucide-react";

interface GestureOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraActive: boolean;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  onToggleCamera: () => void;
  gesture: string;
}

const GestureOverlay = ({
  videoRef,
  canvasRef,
  cameraActive,
  isLoading,
  isReady,
  error,
  onToggleCamera,
  gesture,
}: GestureOverlayProps) => {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      <video ref={videoRef} className="hidden" playsInline muted />

      <AnimatePresence>
        {cameraActive && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="relative w-40 rounded-2xl overflow-hidden shadow-xl border-2 border-[#0DA2E7]"
            style={{ aspectRatio: "4/3" }}
          >
            <video
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
              playsInline
              muted
              ref={(el) => {
                if (el && videoRef.current?.srcObject) {
                  el.srcObject = videoRef.current.srcObject;
                  el.play().catch(() => {});
                }
              }}
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full"
            />
            {gesture !== "none" && (
              <div className="absolute top-1 left-1 bg-white/80 rounded-full px-2 py-0.5 text-xs font-bold text-gray-800">
                {gesture}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="bg-red-500/90 text-white rounded-xl px-3 py-2 text-xs max-w-[200px]">
          {error}
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onToggleCamera}
        disabled={isLoading}
        className={`p-4 rounded-full shadow-lg transition-all ${
          cameraActive
            ? "bg-red-500 text-white"
            : "text-white"
        }`}
        style={!cameraActive ? { background: "linear-gradient(135deg, #0DA2E7, #26d0ce)" } : {}}
      >
        {isLoading ? (
          <Loader2 size={24} className="animate-spin" />
        ) : cameraActive ? (
          <CameraOff size={24} />
        ) : (
          <Camera size={24} />
        )}
      </motion.button>

      {!cameraActive && !isLoading && (
        <span className="text-xs text-gray-500 bg-white rounded-full px-2 py-1 shadow">
          ✋ Gesture Mode
        </span>
      )}
    </div>
  );
};

export default GestureOverlay;
