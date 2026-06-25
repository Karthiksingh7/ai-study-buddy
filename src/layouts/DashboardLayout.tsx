import { ReactNode, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { FloatingChat } from "@/components/FloatingChat";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Loader2, ShieldAlert } from "lucide-react";
import { UserRole } from "@/lib/permissions";

interface DashboardLayoutProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requireAuth?: boolean;
}

// Pages where AI chat should be hidden (to prevent cheating)
const HIDDEN_CHAT_ROUTES = ["/quiz", "/mock-tests"];

// Generate particles with randomized properties
function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const size = Math.random() * 3 + 1.5; // 1.5px to 4.5px
    const left = Math.random() * 100;
    const duration = Math.random() * 12 + 10; // 10s to 22s
    const delay = Math.random() * 15; // 0s to 15s stagger
    const hueShift = Math.random(); // for color variety
    
    let bg = 'radial-gradient(circle, rgba(99, 102, 241, 0.8), rgba(139, 92, 246, 0.4))';
    let shadow = '0 0 6px 2px rgba(99, 102, 241, 0.3)';
    if (hueShift > 0.7) {
      bg = 'radial-gradient(circle, rgba(34, 211, 238, 0.8), rgba(99, 102, 241, 0.4))';
      shadow = '0 0 6px 2px rgba(34, 211, 238, 0.3)';
    } else if (hueShift > 0.4) {
      bg = 'radial-gradient(circle, rgba(139, 92, 246, 0.8), rgba(99, 102, 241, 0.4))';
      shadow = '0 0 6px 2px rgba(139, 92, 246, 0.3)';
    }

    return (
      <div
        key={i}
        className="particle"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          left: `${left}%`,
          bottom: '-5%',
          background: bg,
          boxShadow: shadow,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        }}
      />
    );
  });
}

export function DashboardLayout({ children, requiredRole, requireAuth }: DashboardLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isAdmin, isMentor } = useRole();
  const location = useLocation();

  // Memoize particles so they don't re-render on navigation
  const particles = useMemo(() => generateParticles(40), []);

  // Check if current route should hide the chat
  const shouldHideChat = HIDDEN_CHAT_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  // Only show loading spinner on pages that require authentication
  if ((requireAuth || requiredRole) && (authLoading || roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect to auth if explicitly required (profile, sessions, admin, etc.)
  if ((requireAuth || requiredRole) && !authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Role-based access control
  if (requiredRole && user) {
    let hasAccess = false;
    if (requiredRole === "admin" && isAdmin) hasAccess = true;
    if (requiredRole === "mentor" && (isMentor || isAdmin)) hasAccess = true;
    if (requiredRole === "student") hasAccess = true; // Everyone is at least a student

    if (!hasAccess) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-muted-foreground">
              Required role: <span className="font-medium capitalize">{requiredRole}</span>
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="gradient-mesh-bg">
        <div className="mesh-blob-3" />
      </div>

      {/* Floating particles */}
      <div className="floating-particles">
        {particles}
      </div>

      {/* Sidebar */}
      <AppSidebar />

      {/* Main content — above particles and mesh */}
      <main className="flex-1 h-full overflow-auto relative z-10">
        {children}
      </main>

      {!shouldHideChat && <FloatingChat />}
    </div>
  );
}

