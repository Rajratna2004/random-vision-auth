import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getStoredUser, setToken, setStoredUser } from "@/lib/store";
import { api } from "@/lib/api";
import { checkPasswordStrength, isPasswordValid } from "@/lib/passwordStrength";
import * as faceapi from "face-api.js";

type Mode = "login" | "register" | "face";

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, level, color, checks } = checkPasswordStrength(password);
  const levelLabel = { weak: "Weak", fair: "Fair", good: "Good", strong: "Strong" }[level];

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full transition-all duration-500"
            style={{ backgroundColor: color, width: `${score}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xs font-bold shrink-0" style={{ color }}>
          {levelLabel}
        </span>
      </div>
      <div className="space-y-1">
        {checks.map((check) => (
          <div key={check.id} className="flex items-center gap-1.5 text-xs">
            <span className={check.passed ? "text-green-500" : "text-red-400"}>
              {check.passed ? "✓" : "✗"}
            </span>
            <span className={check.passed ? "text-green-600" : "text-muted-foreground"}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login, register, updateUser } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [faceModelsLoading, setFaceModelsLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [regPassword, setRegPassword] = useState("");
  const [showPasswordChecks, setShowPasswordChecks] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const user = getStoredUser();
  if (user) {
    navigate("/");
    return null;
  }

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setDetecting(false);
    setFaceDetected(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  async function loadFaceModels() {
    if (faceModelsLoaded) return;
    setFaceModelsLoading(true);
    try {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setFaceModelsLoaded(true);
    } catch (e) {
      toast({ title: "Could not load face models", description: "Check your connection and try again.", variant: "destructive" });
    }
    setFaceModelsLoading(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setDetecting(true);
    } catch (e) {
      toast({ title: "Camera Error", description: "Could not access your camera. Please allow camera access.", variant: "destructive" });
      setMode("login");
    }
  }

  function handleModeSwitch(m: Mode) {
    if (mode === "face" && m !== "face") stopCamera();
    setMode(m);
    if (m === "face") {
      loadFaceModels().then(() => startCamera());
    }
  }

  async function handleFaceLogin() {
    if (!videoRef.current) return;
    if (!faceModelsLoaded) {
      toast({ title: "Still loading", description: "Please wait for face models to finish loading." });
      return;
    }
    setLoading(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        toast({ title: "No face detected", description: "Make sure your face is clearly visible and well-lit.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setFaceDetected(true);
      const descriptor = Array.from(detection.descriptor);
      const res: any = await api.face.verify(descriptor);

      if (res.match && res.user && res.token) {
        setToken(res.token);
        setStoredUser(res.user);
        updateUser(res.user);
        stopCamera();
        toast({ title: `Welcome back, ${res.user.firstName}! 😊🎉`, description: "Face login successful!" });
        navigate("/");
      } else if (res.match && res.user) {
        toast({ title: `Face matched! Hi ${res.user.firstName} 😊`, description: "Please log in with your password this one time.", variant: "default" });
        setMode("login");
        stopCamera();
      } else {
        toast({ title: "Face not recognized", description: "No matching account found. Please register your face in Profile settings.", variant: "destructive" });
        setFaceDetected(false);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Face login failed", variant: "destructive" });
      setFaceDetected(false);
    }
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await login(fd.get("email") as string, fd.get("password") as string);
      toast({ title: `Welcome back, ${(res as any).user.firstName}! 🎉` });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    if (fd.get("password") !== fd.get("confirmPassword")) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!isPasswordValid(password)) {
      setShowPasswordChecks(true);
      toast({ title: "Password too weak", description: "Please meet all the password requirements below.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await register({
        username: fd.get("username"),
        email: fd.get("email"),
        password,
        firstName: fd.get("firstName"),
        lastName: fd.get("lastName"),
        role: "student",
      });
      toast({ title: `Account created! Welcome, ${(res as any).user.firstName}! 🎉` });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0DA2E7 0%, #0ebaff 55%, #26d0ce 100%)" }}>
      {/* Left panel — visible on desktop */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-[52%] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.13) 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} />
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg border border-white/30">
              🦁
            </div>
            <span className="font-heading text-white text-3xl">KidoLearn</span>
          </div>
          <h2 className="font-heading text-5xl text-white leading-tight mb-5"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
            Learn.<br />Play.<br />Grow.
          </h2>
          <p className="text-white/80 text-lg leading-relaxed max-w-xs">
            An interactive learning platform with AI-powered quizzes, hand-tracking games, and structured courses for students.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { icon: "📚", label: "Structured Courses" },
              { icon: "🤖", label: "AI Quizzes" },
              { icon: "🎮", label: "Hand Tracking" },
            ].map((f) => (
              <div key={f.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20 text-center">
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-white/80 text-xs font-semibold leading-tight">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login card */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 lg:bg-white/5 lg:backdrop-blur-sm">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 lg:hidden"
          >
            <div className="w-16 h-16 rounded-2xl kid-gradient flex items-center justify-center text-3xl shadow-xl mx-auto mb-3">
              🦁
            </div>
            <h1 className="font-heading text-4xl text-white">KidoLearn</h1>
            <p className="text-white/80 text-sm mt-1">Learn. Play. Grow.</p>
          </motion.div>

          <Card className="shadow-2xl border-0 overflow-hidden rounded-3xl"
                style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)" }}>
            <div className="kid-gradient px-5 pt-5 pb-4">
              <div className="flex gap-2 justify-center">
                {([
                  { key: "login", label: "🔑 Login" },
                  { key: "register", label: "✨ Sign Up" },
                  { key: "face", label: "😊 Face" },
                ] as { key: Mode; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleModeSwitch(key)}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-150 ${
                      mode === key
                        ? "bg-white text-[#0DA2E7] shadow-md"
                        : "text-white/85 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <CardContent className="p-6 pt-5">
              <AnimatePresence mode="wait">
                {mode === "login" && (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" required placeholder="you@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" name="password" type="password" required placeholder="Your password" />
                    </div>
                    <Button type="submit" className="w-full kid-gradient text-white font-bold" disabled={loading}>
                      {loading ? "Logging in..." : "🚀 Let's Go!"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Want to login with your face?{" "}
                      <button type="button" className="text-primary font-semibold underline" onClick={() => handleModeSwitch("face")}>
                        Try Face Login 😊
                      </button>
                    </p>
                  </motion.form>
                )}

                {mode === "register" && (
                  <motion.form
                    key="register"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    onSubmit={handleRegister}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" name="firstName" required placeholder="Alex" />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" name="lastName" required placeholder="Smith" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" name="username" required placeholder="coolkid123" />
                    </div>
                    <div>
                      <Label htmlFor="email-reg">Email</Label>
                      <Input id="email-reg" name="email" type="email" required placeholder="you@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="password-reg">Password</Label>
                      <Input
                        id="password-reg"
                        name="password"
                        type="password"
                        required
                        placeholder="Min 12 chars, mixed case + numbers"
                        value={regPassword}
                        onChange={(e) => { setRegPassword(e.target.value); setShowPasswordChecks(true); }}
                        onFocus={() => setShowPasswordChecks(true)}
                      />
                      {showPasswordChecks && <PasswordStrengthMeter password={regPassword} />}
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" name="confirmPassword" type="password" required placeholder="Same as above" />
                    </div>
                    <Button type="submit" className="w-full kid-gradient text-white font-bold" disabled={loading}>
                      {loading ? "Creating account..." : "✨ Create Account!"}
                    </Button>
                  </motion.form>
                )}

                {mode === "face" && (
                  <motion.div
                    key="face"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4 text-center"
                  >
                    <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {faceDetected && (
                        <div className="absolute inset-0 border-4 border-green-400 rounded-xl animate-pulse" />
                      )}
                      {(!faceModelsLoaded || !detecting) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white text-sm gap-2">
                          <span className="text-3xl">{faceModelsLoading ? "⏳" : "😊"}</span>
                          <span className="font-semibold">
                            {faceModelsLoading ? "Loading face recognition..." : "Starting camera..."}
                          </span>
                          <span className="text-white/70 text-xs">This may take a few seconds</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-blue-50 rounded-xl px-4 py-3 text-left">
                      <p className="text-sm font-semibold text-blue-800 mb-1">📋 How it works:</p>
                      <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
                        <li>Look directly at the camera</li>
                        <li>Make sure your face is well-lit</li>
                        <li>Click "Recognize Me!" to log in</li>
                      </ol>
                    </div>
                    <Button
                      onClick={handleFaceLogin}
                      className="w-full kid-gradient text-white font-bold"
                      disabled={loading || !faceModelsLoaded || !detecting}
                    >
                      {loading ? "Scanning..." : faceModelsLoading ? "Loading models..." : !detecting ? "Starting camera..." : "😊 Recognize Me!"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      First time? Register your face in{" "}
                      <span className="font-semibold text-primary">Profile Settings</span> after logging in.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
