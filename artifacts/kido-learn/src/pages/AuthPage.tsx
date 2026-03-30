import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getStoredUser } from "@/lib/store";
import { api } from "@/lib/api";
import * as faceapi from "face-api.js";

type Mode = "login" | "register" | "face";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login, register, updateUser } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const user = getStoredUser();
  if (user) {
    navigate("/");
    return null;
  }

  useEffect(() => {
    loadFaceModels();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (mode === "face") {
      startCamera();
    } else {
      stopCamera();
    }
  }, [mode]);

  async function loadFaceModels() {
    try {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setFaceModelsLoaded(true);
    } catch (e) {
      console.error("Face models failed to load:", e);
    }
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
      toast({ title: "Camera Error", description: "Could not access camera", variant: "destructive" });
      setMode("login");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setDetecting(false);
    setFaceDetected(false);
  }

  async function handleFaceLogin() {
    if (!videoRef.current || !faceModelsLoaded) return;
    setLoading(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        toast({ title: "No face detected", description: "Make sure your face is clearly visible", variant: "destructive" });
        setLoading(false);
        return;
      }

      setFaceDetected(true);
      const descriptor = Array.from(detection.descriptor);
      const res: any = await api.face.verify(descriptor);

      if (res.match && res.user) {
        const loginRes: any = await api.auth.login({ email: res.user.email, password: "__FACE_LOGIN_BYPASS__" }).catch(() => null);
        if (loginRes) {
          const { setToken } = await import("@/lib/store");
          setToken(loginRes.token);
          updateUser(loginRes.user);
          toast({ title: `Welcome back, ${loginRes.user.firstName}! 🎉` });
          navigate("/");
        } else {
          toast({ title: `Welcome, ${res.user.firstName}!`, description: "Face matched — please also enter your password once." });
          setMode("login");
        }
      } else {
        toast({ title: "Face not recognized", description: "No matching account found", variant: "destructive" });
        setFaceDetected(false);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Face login failed", variant: "destructive" });
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
    if (fd.get("password") !== fd.get("confirmPassword")) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await register({
        username: fd.get("username"),
        email: fd.get("email"),
        password: fd.get("password"),
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
    <div className="min-h-screen sky-hero flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating items behind card */}
      <div className="absolute top-8 left-[5%] text-5xl float-item select-none pointer-events-none font-heading font-bold" style={{ color: "#FF6B6B", textShadow: "0 3px 0 rgba(0,0,0,0.15)", animationDelay: "0s" }}>A</div>
      <div className="absolute top-12 right-[8%] text-4xl float-item select-none pointer-events-none font-heading font-bold" style={{ color: "#4CAF50", textShadow: "0 3px 0 rgba(0,0,0,0.15)", animationDelay: "0.7s" }}>B</div>
      <div className="absolute bottom-16 left-[10%] text-4xl float-item select-none pointer-events-none font-heading font-bold" style={{ color: "#F7971E", textShadow: "0 3px 0 rgba(0,0,0,0.15)", animationDelay: "0.4s" }}>1</div>
      <div className="absolute bottom-20 right-[6%] text-4xl float-item select-none pointer-events-none font-heading font-bold" style={{ color: "#9B59B6", textShadow: "0 3px 0 rgba(0,0,0,0.15)", animationDelay: "1s" }}>2</div>
      <div className="absolute top-1/3 left-[3%] text-3xl float-item-slow select-none pointer-events-none" style={{ animationDelay: "0.3s" }}>⭐</div>
      <div className="absolute top-1/4 right-[4%] text-3xl float-item-slow select-none pointer-events-none" style={{ animationDelay: "1.2s" }}>🌟</div>

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="w-20 h-20 rounded-3xl kid-gradient flex items-center justify-center text-4xl shadow-xl mx-auto mb-3">
            🦁
          </div>
          <h1 className="font-heading text-5xl text-white drop-shadow-lg" style={{ textShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
            KidoLearn
          </h1>
          <p className="text-white/90 font-bold mt-1">✨ Learn, Play &amp; Grow! ✨</p>
        </motion.div>

        <Card className="shadow-2xl border-0 overflow-hidden rounded-3xl">
          <div className="kid-gradient px-4 pt-4 pb-4">
            <div className="flex gap-2 justify-center">
              {(["login", "register", "face"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
                    mode === m
                      ? "bg-white text-[#0DA2E7] shadow-md"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  {m === "login" ? "🔑 Login" : m === "register" ? "✨ Sign Up" : "😊 Face Login"}
                </button>
              ))}
            </div>
          </div>

          <CardContent className="p-6">
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
                    <Input id="password" name="password" type="password" required placeholder="••••••" />
                  </div>
                  <Button type="submit" className="w-full kid-gradient text-white font-bold" disabled={loading}>
                    {loading ? "Logging in..." : "🚀 Let's Go!"}
                  </Button>
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
                    <Input id="password-reg" name="password" type="password" required placeholder="Min 6 characters" />
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
                    {!faceModelsLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
                        Loading face models...
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Look at the camera and click the button below
                  </p>
                  <Button
                    onClick={handleFaceLogin}
                    className="w-full kid-gradient text-white font-bold"
                    disabled={loading || !faceModelsLoaded}
                  >
                    {loading ? "Scanning..." : "😊 Recognize Me!"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    You need to register your face in Profile settings first
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
