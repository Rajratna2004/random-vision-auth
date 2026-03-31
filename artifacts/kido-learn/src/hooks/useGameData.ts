import { useCallback } from "react";

export function useGameData() {
  const saveSession = useCallback(async (_data: {
    game_type: string;
    score: number;
    moves?: number;
    duration_seconds?: number;
    difficulty?: string;
    completed?: boolean;
  }) => {
    // No-op stub — data saved locally or not persisted
  }, []);

  return { saveSession };
}
