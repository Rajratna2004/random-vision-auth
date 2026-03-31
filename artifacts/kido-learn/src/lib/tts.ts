let speaking = false;

export function speak(text: string, rate = 0.9, pitch = 1.2) {
  if (!("speechSynthesis" in window) || speaking) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 0.8;
  speaking = true;
  utterance.onend = () => { speaking = false; };
  utterance.onerror = () => { speaking = false; };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
  speaking = false;
}
