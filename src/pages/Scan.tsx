import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Upload, X, Loader2, ImageIcon, AlertTriangle, RefreshCw, SwitchCamera, Zap, Sparkles, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FormattedMessage } from "@/components/FormattedMessage";



export default function Scan() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraSupported, setIsCameraSupported] = useState(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { user } = useAuth();

  // Check camera support on mount
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsCameraSupported(false);
    }
  }, []);

  // Initialize camera when showCamera becomes true
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [showCamera]);

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

  const startCamera = useCallback(async (mode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setIsCameraReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not supported in this browser. Please use Chrome, Firefox, or Safari.");
      return;
    }

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
      });
      streamRef.current = stream;
      setFacingMode(mode);
      setShowCamera(true);

      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().then(() => {
            setIsCameraReady(true);
          }).catch(console.error);
        }
      }, 100);
    } catch (error: any) {
      console.error("Camera error:", error);

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError("Camera access denied. Please allow camera permissions in your browser settings and try again.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError("No camera found. Please connect a camera and try again.");
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setCameraError("Camera is in use by another application. Please close other camera apps and try again.");
      } else if (error.name === "OverconstrainedError") {
        // Try without facing mode constraint
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          setShowCamera(true);
          setTimeout(() => {
            if (videoRef.current && streamRef.current) {
              videoRef.current.srcObject = streamRef.current;
              videoRef.current.play().then(() => {
                setIsCameraReady(true);
              }).catch(console.error);
            }
          }, 100);
        } catch (fallbackError: any) {
          setCameraError(`Could not access camera: ${fallbackError.message || "Unknown error"}`);
        }
      } else {
        setCameraError(`Could not access camera: ${error.message || "Unknown error"}`);
      }
    }
  }, [facingMode]);

  const switchCamera = useCallback(() => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    startCamera(newMode);
  }, [facingMode, startCamera]);

  const capturePhoto = () => {
    if (videoRef.current && isCameraReady) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0);
      setImage(canvas.toDataURL("image/jpeg", 0.9));
      setExplanation("");
      stopCamera();
      toast.success("Photo captured!");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setIsCameraReady(false);
  };

  const analyzeImage = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    try {
      const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
      if (!apiKey) throw new Error('Gemini API key not configured');

      // Robustly extract base64 data and mime type from data URL
      let mimeType = 'image/jpeg';
      let base64Data = '';

      if (image.startsWith('data:')) {
        const commaIndex = image.indexOf(',');
        if (commaIndex === -1) throw new Error('Invalid image data');

        const header = image.slice(0, commaIndex); // e.g. "data:image/jpeg;base64"
        base64Data = image.slice(commaIndex + 1);

        // Extract MIME type from header
        const mimeMatch = header.match(/data:([^;,]+)/);
        if (mimeMatch) mimeType = mimeMatch[1];
      } else {
        throw new Error('Invalid image format. Please recapture or re-upload.');
      }

      if (!base64Data) throw new Error('Could not extract image data');

      const models = ['gemini-2.5-flash'];
      let lastError = '';

      for (const model of models) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      { text: 'Analyze this image in detail. If it contains text, notes, equations, or problems, provide a detailed explanation and solution. If it contains diagrams, explain what they represent. Use markdown formatting with headers and bullet points.' },
                      { inlineData: { mimeType, data: base64Data } }
                    ]
                  }],
                  systemInstruction: {
                    parts: [{ text: 'You are an expert tutor who analyzes student notes, textbook pages, diagrams, and problems. Provide clear, educational explanations using markdown formatting.' }]
                  },
                  generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
                })
              }
            );

            if (response.ok) {
              const data = await response.json();
              const explanationText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not analyze the image.';
              setExplanation(explanationText);

              // Save to database
              if (user) {
                await supabase.from("scanned_notes").insert({
                  user_id: user.id,
                  image_url: image.slice(0, 500),
                  ai_explanation: explanationText,
                });
              }
              toast.success("Analysis complete!");
              return;
            }

            const errorBody = await response.text();
            lastError = errorBody;

            // Rate limit — retry with backoff
            if (response.status === 429 || errorBody.includes('RESOURCE_EXHAUSTED')) {
              const delay = 2000 * Math.pow(2, attempt);
              console.warn(`Rate limited on ${model}, retrying in ${delay / 1000}s...`);
              await new Promise(r => setTimeout(r, delay));
              continue;
            }

            // Other error — break to try next model
            break;
          } catch (fetchErr: any) {
            lastError = fetchErr.message;
            break;
          }
        }
      }

      throw new Error(lastError || 'Failed to analyze image');
    } catch (error: any) {
      console.error("Analyze error:", error);
      toast.error(error.message || "Failed to analyze image. Please try again.");
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
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="p-6 border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/20">
            <Camera className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Smart Scan
            </h1>
            <p className="text-muted-foreground text-sm">Capture notes or problems and get AI explanations</p>
          </div>
        </div>
      </div>

      {/* Camera View */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Camera Header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary animate-pulse" />
              Scanning...
            </h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={switchCamera}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <SwitchCamera className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={stopCamera}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Video with Scanner Overlay */}
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Scanner Frame Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner Brackets */}
              <div className="absolute top-[15%] left-[10%] w-16 h-16 border-l-4 border-t-4 border-primary rounded-tl-lg" />
              <div className="absolute top-[15%] right-[10%] w-16 h-16 border-r-4 border-t-4 border-primary rounded-tr-lg" />
              <div className="absolute bottom-[25%] left-[10%] w-16 h-16 border-l-4 border-b-4 border-primary rounded-bl-lg" />
              <div className="absolute bottom-[25%] right-[10%] w-16 h-16 border-r-4 border-b-4 border-primary rounded-br-lg" />

              {/* Scanning Line Animation */}
              <div className="absolute left-[10%] right-[10%] h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
            </div>

            {/* Camera Loading Indicator */}
            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-white text-sm">Initializing camera...</p>
                </div>
              </div>
            )}
          </div>

          {/* Capture Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent flex justify-center items-center gap-6">
            <button
              onClick={capturePhoto}
              disabled={!isCameraReady}
              className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-2xl shadow-primary/50 transition-all duration-300 ${isCameraReady ? 'hover:scale-110 active:scale-95' : 'opacity-50'
                }`}
            >
              <div className="w-16 h-16 rounded-full border-4 border-white/90 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!image && !showCamera && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto custom-scrollbar">
          <div className="glass-card p-10 text-center max-w-lg w-full relative overflow-hidden group">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Icon */}
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-cyan-400 animate-pulse opacity-20" />
              <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-primary/20 to-cyan-400/20 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
                <ImageIcon className="w-12 h-12 text-primary" />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Capture Your Notes
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Take a photo or upload an image of your notes, textbook, or problem to get an instant AI explanation
            </p>

            {/* Camera Error Display */}
            {cameraError && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm animate-in fade-in">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-destructive font-semibold">Camera Error</p>
                    <p className="text-muted-foreground mt-1">{cameraError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              {isCameraSupported ? (
                <Button
                  onClick={() => startCamera()}
                  size="lg"
                  className="px-6 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                >
                  {cameraError ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Retry Camera
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mr-2" />
                      Open Camera
                    </>
                  )}
                </Button>
              ) : (
                <Button disabled variant="secondary" size="lg">
                  <Camera className="w-5 h-5 mr-2" />
                  Camera Not Supported
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 border-border/50 hover:bg-secondary/80 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Image
              </Button>
            </div>

            {!isCameraSupported && (
              <p className="text-xs text-muted-foreground mt-6">
                Your browser doesn't support camera access. Please use the Upload option or try Chrome/Firefox/Safari.
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg w-full">
            {[
              { icon: Zap, title: "Instant", desc: "Quick analysis" },
              { icon: Sparkles, title: "AI-Powered", desc: "Smart explanations" },
              { icon: ScanLine, title: "Any Subject", desc: "Works with all topics" },
            ].map((feature, i) => (
              <div
                key={i}
                className="text-center p-4 rounded-xl bg-card/50 border border-border/30 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
              >
                <feature.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Preview */}
      {image && !showCamera && (
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Image Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative glass-card p-4 overflow-hidden">
                <img
                  src={image}
                  alt="Captured"
                  className="w-full max-h-[400px] object-contain rounded-xl"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-6 right-6 shadow-lg"
                  onClick={clearImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Analyze Button */}
            {!explanation && (
              <Button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-lg shadow-primary/25 transition-all duration-300 py-6 text-lg font-semibold"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Analyze & Explain
                  </>
                )}
              </Button>
            )}

            {/* Explanation Card */}
            {explanation && (
              <div className="glass-card p-6 animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                {/* Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-cyan-400 to-primary" />

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                    AI Explanation
                  </h3>
                </div>

                <div className="prose prose-invert max-w-none">
                  <FormattedMessage content={explanation} />
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex gap-3">
                  <Button variant="outline" onClick={clearImage} className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Scan Another
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
