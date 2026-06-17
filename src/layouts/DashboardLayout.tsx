import { ReactNode } from "react";
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

export function DashboardLayout({ children, requiredRole, requireAuth }: DashboardLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isAdmin, isMentor } = useRole();
  const location = useLocation();

  // Check if current route should hide the chat
  const shouldHideChat = HIDDEN_CHAT_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect to auth if explicitly required (profile, dashboard, admin, etc.)
  if ((requireAuth || requiredRole) && !user) {
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
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 h-full overflow-auto">
        {children}
      </main>
      {!shouldHideChat && <FloatingChat />}
    </div>
  );
}

