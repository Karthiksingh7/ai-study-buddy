import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  Camera, 
  Mic, 
  BookOpen, 
  Sparkles,
  LogOut,
  Menu,
  X,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NavItem {
  title: string;
  icon: React.ElementType;
  path: string;
  description: string;
}

const navItems: NavItem[] = [
  { title: "AI Chat", icon: MessageSquare, path: "/chat", description: "Text-based tutor" },
  { title: "Voice Buddy", icon: Mic, path: "/voice", description: "Hands-free assistant" },
  { title: "Smart Scan", icon: Camera, path: "/scan", description: "Capture & explain" },
  { title: "Flashcards", icon: Sparkles, path: "/flashcards", description: "AI-generated cards" },
  { title: "Study Sessions", icon: BookOpen, path: "/sessions", description: "Track progress" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      navigate("/auth");
      toast.success("Signed out successfully");
    }
  };

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">StudyBuddy</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full sidebar-item",
                isActive && "active"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-primary" : "text-sidebar-foreground")} />
              {!collapsed && (
                <div className="text-left">
                  <div className={cn("text-sm font-medium", isActive ? "text-primary" : "text-sidebar-foreground")}>
                    {item.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full sidebar-item text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
