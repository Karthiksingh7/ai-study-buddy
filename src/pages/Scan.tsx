import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function Scan() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { user } = useAuth();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image too large. Max 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setExplanation("");
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      toast.error("Could not access camera");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0);
      setImage(canvas.toDataURL("image/jpeg"));
      setExplanation("");
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const analyzeImage = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Please analyze and explain this image." }],
          type: "image_explain",
          imageData: image,
        }),
      });

      if (!response.ok) throw new Error("Failed to analyze image");

      const data = await response.json();
      const explanationText = data.choices?.[0]?.message?.content || "Could not analyze the image.";
      setExplanation(explanationText);

      // Save to database
      if (user) {
        await supabase.from("scanned_notes").insert({
          user_id: user.id,
          image_url: image.slice(0, 500), // Store first part for reference
          ai_explanation: explanationText,
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setExplanation("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Camera className="w-6 h-6 text-primary" />
          Smart Scan
        </h1>
        <p className="text-muted-foreground">Capture notes or problems and get AI explanations</p>
      </div>

      {/* Camera View */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Take a Photo</h2>
            <Button variant="ghost" size="icon" onClick={stopCamera}>
              <X className="w-6 h-6" />
            </Button>
          </div>
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 flex justify-center">
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-primary flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full border-4 border-primary-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!image && !showCamera && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="glass-card p-12 text-center max-w-md w-full">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Capture Your Notes</h2>
            <p className="text-muted-foreground mb-6">
              Take a photo or upload an image of your notes, textbook, or problem to get an AI explanation
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={startCamera}>
                <Camera className="w-5 h-5 mr-2" />
                Camera
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-5 h-5 mr-2" />
                Upload
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Image Preview */}
      {image && !showCamera && (
        <div className="flex-1 space-y-6">
          <div className="relative">
            <img
              src={image}
              alt="Captured"
              className="w-full max-h-[400px] object-contain rounded-xl border border-border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearImage}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {!explanation && (
            <Button onClick={analyzeImage} disabled={isAnalyzing} className="w-full">
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze & Explain"
              )}
            </Button>
          )}

          {explanation && (
            <div className="glass-card p-6 animate-fade-in">
              <h3 className="text-lg font-semibold mb-4 text-primary">AI Explanation</h3>
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-foreground">{explanation}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={clearImage}>
                  Scan Another
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
