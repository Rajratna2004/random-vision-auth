import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getStoredUser, setStoredUser, getToken } from "@/lib/store";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import * as faceapi from "face-api.js";
import ProgressDashboard from "@/components/ProgressDashboard";

export default function ProfilePage() {
  const { toast } = useToast();
  const user = getStoredUser();
  const [faceRegistering, setFaceRegistering] = useState(false);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: progress = [] } = useQuery({
    queryKey: ["progress"],
    queryFn: () => api.progress.list(),
  });

  useEffect(() => {
    loadModels();
    return () => stopCamera();
  }, []);

  async function loadModels() {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      setFaceModelsLoaded(true);
    } catch (e) {
      console.error("Face models failed", e);
    }
  }

  async function startFaceRegistration() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      toast({ title: "Camera Error", description: "Could not access camera", variant: "destructive" });
    }
  }

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  async function captureAndRegisterFace() {
    if (!videoRef.current || !faceModelsLoaded) return;
    setFaceRegistering(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        toast({ title: "No face detected", description: "Make sure your face is clearly visible", variant: "destructive" });
        setFaceRegistering(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      await api.face.register(descriptor);

      const updatedUser = { ...user!, hasFace: true };
      setStoredUser(updatedUser);

      toast({ title: "Face registered! 🎉", description: "You can now use face login" });
      stopCamera();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to register face", variant: "destructive" });
    }
    setFaceRegistering(false);
  }

  const stats = {
    coursesStarted: (progress as any[]).filter((p: any) => p.completedLessons > 0).length,
    lessonsCompleted: (progress as any[]).reduce((sum: number, p: any) => sum + p.completedLessons, 0),
    coursesCompleted: (progress as any[]).filter((p: any) => p.percentComplete === 100).length,
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold">👤 My Profile</h1>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>Profile Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full kid-gradient flex items-center justify-center text-3xl text-white font-bold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{user.firstName} {user.lastName}</h2>
                  <p className="text-muted-foreground">@{user.username}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="ml-auto">
                  <Badge className="kid-gradient text-white border-0">{user.role}</Badge>
                  {user.hasFace && (
                    <Badge className="ml-2 bg-green-100 text-green-700 border-0">😊 Face Enabled</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <ProgressDashboard
          firstName={user.firstName}
          lastName={user.lastName}
          progress={{
            coursesStarted: stats.coursesStarted,
            lessonsCompleted: stats.lessonsCompleted,
            coursesCompleted: stats.coursesCompleted,
            totalCourses: 6,
            totalLessons: 60,
          }}
        />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle>😊 Face Login Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.hasFace ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                  <span className="text-3xl">✅</span>
                  <div>
                    <p className="font-semibold text-green-700">Face login is enabled!</p>
                    <p className="text-sm text-green-600">You can log in with your face on the login page.</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 rounded-xl text-blue-700 text-sm">
                  <p className="font-semibold mb-1">Face login not set up yet</p>
                  <p>Register your face below to enable quick face login!</p>
                </div>
              )}

              {!cameraActive ? (
                <Button
                  onClick={startFaceRegistration}
                  variant={user.hasFace ? "outline" : "default"}
                  className={!user.hasFace ? "kid-gradient text-white" : ""}
                >
                  {user.hasFace ? "🔄 Update Face" : "📸 Register Face"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    {!faceModelsLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
                        Loading face models...
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={captureAndRegisterFace}
                      disabled={faceRegistering || !faceModelsLoaded}
                      className="kid-gradient text-white flex-1"
                    >
                      {faceRegistering ? "Capturing..." : "📸 Capture & Register"}
                    </Button>
                    <Button variant="outline" onClick={stopCamera}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
