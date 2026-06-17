import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Mail, ArrowRight, Loader2, KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AuthStep = "email" | "otp";

export default function Auth() {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error("Backend is not configured. Please set up Supabase environment variables (.env file) to enable authentication.");
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) throw error;

      toast.success("OTP sent! Check your email inbox.");
      setStep("otp");
      startResendCooldown();
    } catch (error: any) {
      const message = error.message || "Failed to send OTP";
      if (message.includes("rate") || message.includes("limit")) {
        toast.error("Too many requests. Please wait a minute and try again.");
      } else if (message.includes("fetch") || message.includes("NetworkError")) {
        toast.error("Unable to connect to the server. Check your internet connection.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP code
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const token = otp.join("");
    if (token.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: "email",
      });
      if (error) throw error;

      if (data.session) {
        // Create profile if it doesn't exist
        try {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", data.session.user.id)
            .single();

          if (!existingProfile) {
            const displayName = email.split("@")[0];
            await supabase.from("profiles").insert({
              user_id: data.session.user.id,
              display_name: displayName,
            });
          }
        } catch {
          // Profile creation is best-effort, don't block login
          console.warn("Could not create/check profile");
        }

        toast.success("Welcome to StudyBuddy! 🎉");
        navigate("/dashboard");
      }
    } catch (error: any) {
      const message = error.message || "Verification failed";
      if (message.includes("expired") || message.includes("invalid")) {
        toast.error("Invalid or expired code. Please request a new one.");
      } else if (message.includes("fetch") || message.includes("NetworkError")) {
        toast.error("Unable to connect to the server. Check your internet connection.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP with cooldown
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) throw error;

      toast.success("New OTP sent! Check your email.");
      setOtp(["", "", "", "", "", ""]);
      startResendCooldown();
    } catch (error: any) {
      toast.error(error.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();

      // Auto-verify if all 6 digits entered
      if (newOtp.every((d) => d !== "")) {
        setTimeout(() => {
          const token = newOtp.join("");
          if (token.length === 6) handleVerifyOtp();
        }, 200);
      }
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (digit && index === 5 && newOtp.every((d) => d !== "")) {
      setTimeout(() => handleVerifyOtp(), 200);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary glow-effect mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">StudyBuddy AI</h1>
          <p className="text-muted-foreground mt-2">Your intelligent learning companion</p>
        </div>

        {/* Auth Card */}
        <div className="glass-card p-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {step === "email" ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Welcome</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email to receive a login code
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="your.email@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-secondary border-border h-12 text-base"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Login Code
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground mt-4">
                We'll send a 6-digit verification code to your email.
                <br />
                No password needed!
              </p>

              <div className="mt-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-2"
                >
                  Continue as Guest
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <KeyRound className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Enter Verification Code</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* OTP Input */}
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onFocus={(e) => e.target.select()}
                      className="w-12 h-14 text-center text-xl font-bold rounded-lg border-2 border-border bg-secondary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      disabled={loading}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Verify & Sign In
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Resend & Back */}
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("email");
                    setOtp(["", "", "", "", "", ""]);
                  }}
                  disabled={loading}
                >
                  ← Change email
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={loading || resendCooldown > 0}
                  className="gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-3">
                Check your spam folder if you don't see the email.
              </p>

              <div className="mt-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-2"
                >
                  Continue as Guest
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Features hint */}
        <div
          className="mt-8 text-center text-sm text-muted-foreground animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <p>✨ AI Chat • 📸 Smart Scan • 🎤 Voice Buddy • 📚 Flashcards</p>
        </div>
      </div>
    </div>
  );
}
