import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Camera,
  Mic,
  BookOpen,
  Sparkles,
  LogOut,
  LogIn,
  Menu,
  X,
  GraduationCap,
  Brain,
  User,
  Users,
  Gamepad2,
  Clock,
  CalendarDays,
  BarChart3,
  FileText,
  ClipboardList,
  Shield,
  Code2,
  ChevronRight,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { getRoleColor } from "@/lib/permissions";

interface NavItem {
  title: string;
  icon: React.ElementType;
  path: string;
  description: string;
  badge?: string;
  color?: string;
}


const studentNavItems: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard", description: "Feature hub", color: "bg-indigo-500" },
  { title: "AI Chat", icon: MessageSquare, path: "/chat", description: "Text-based tutor", color: "bg-blue-500" },
  { title: "Smart Learning", icon: BookOpen, path: "/learn", description: "Topic-centered learning", color: "bg-emerald-500" },
  { title: "Study Planner", icon: CalendarDays, path: "/study-planner", description: "AI-powered schedules", badge: "NEW", color: "bg-violet-500" },
  { title: "Analytics", icon: BarChart3, path: "/analytics", description: "Track progress", badge: "NEW", color: "bg-amber-500" },
  { title: "Community", icon: Users, path: "/community", description: "Study groups", color: "bg-rose-500" },
  { title: "Voice Buddy", icon: Mic, path: "/voice", description: "Hands-free assistant", color: "bg-cyan-500" },
  { title: "Smart Scan", icon: Camera, path: "/scan", description: "Capture & explain", color: "bg-orange-500" },
  { title: "AI Quiz", icon: Brain, path: "/quiz", description: "Test your knowledge", color: "bg-purple-500" },
  { title: "Mock Tests", icon: ClipboardList, path: "/mock-tests", description: "Full practice tests", badge: "NEW", color: "bg-red-500" },
  { title: "Coding Practice", icon: Code2, path: "/coding", description: "LeetCode-style problems", badge: "NEW", color: "bg-green-500" },
  { title: "Flashcards", icon: Sparkles, path: "/flashcards", description: "AI-generated cards", color: "bg-fuchsia-500" },
  { title: "Documents", icon: FileText, path: "/documents", description: "PDF & Notes analysis", badge: "NEW", color: "bg-sky-500" },
  { title: "Daily Vocab", icon: BookOpen, path: "/vocabulary", description: "Learn new words", badge: "NEW", color: "bg-indigo-400" },
  { title: "Syllabus", icon: GraduationCap, path: "/syllabus", description: "Track curriculum", badge: "NEW", color: "bg-teal-500" },
  { title: "Classrooms", icon: Users, path: "/classrooms", description: "Join study groups", badge: "NEW", color: "bg-lime-500" },
  { title: "Smart Break", icon: Gamepad2, path: "/games", description: "Brain training", color: "bg-yellow-500" },
  { title: "Sessions", icon: Clock, path: "/sessions", description: "Track progress", color: "bg-slate-500" },
];

const accountNavItems: NavItem[] = [
  { title: "My Profile", icon: User, path: "/profile", description: "Learning profile", color: "bg-gray-500" },
];

const mentorNavItems: NavItem[] = [
  { title: "Mentor Dashboard", icon: GraduationCap, path: "/mentor", description: "Manage students", color: "bg-amber-500" },
];

const adminNavItems: NavItem[] = [
  { title: "Admin Dashboard", icon: Shield, path: "/admin", description: "Platform management", color: "bg-red-500" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isAdmin: isAdminUser, isMentor: isMentorUser } = useRole();
  const { user } = useAuth();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      navigate("/auth");
      toast.success("Signed out successfully");
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={cn(
          "group w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
          isActive ? item.color : "bg-muted"
        )}>
          <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-muted-foreground")} />
        </div>
        {!collapsed && (
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-medium truncate",
                isActive ? "text-primary" : "text-foreground"
              )}>
                {item.title}
              </span>
              {item.badge && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                  {item.badge}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
          </div>
        )}
        {!collapsed && (
          <ChevronRight className={cn(
            "w-4 h-4 text-muted-foreground/40 transition-opacity",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )} />
        )}
      </button>
    );
  };

  const renderSectionHeader = (title: string) => {
    if (collapsed) return null;
    return (
      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "h-screen backdrop-blur-xl bg-white/80 border-r border-border flex flex-col transition-all duration-200 relative z-20",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-foreground block">StudyBuddy</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">AI Learning</span>
                {role && (
                  <Badge className={cn("text-[9px] capitalize px-1.5 py-0", getRoleColor(role))}>
                    {role}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <nav className="py-2 space-y-0.5">
          {/* Admin Section */}
          {isAdminUser && (
            <>
              {renderSectionHeader("Administration")}
              {adminNavItems.map(renderNavItem)}
            </>
          )}

          {/* Mentor Section */}
          {isMentorUser && (
            <>
              {renderSectionHeader("Mentor Tools")}
              {mentorNavItems.map(renderNavItem)}
            </>
          )}

          {/* Main Navigation */}
          {(isAdminUser || isMentorUser) && renderSectionHeader("Study Tools")}
          {!isAdminUser && !isMentorUser && !collapsed && (
            <div className="px-3 pt-2 pb-3">
              <div className="p-3 rounded-md bg-muted border border-border">
                <p className="text-xs font-medium text-foreground">Welcome back!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ready to learn something new?</p>
              </div>
            </div>
          )}
          {studentNavItems.map(renderNavItem)}

          {/* Account Section */}
          {renderSectionHeader("Account")}
          {accountNavItems.map(renderNavItem)}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={user ? handleLogout : () => navigate('/auth')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
            user
              ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
          )}
        >
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
            {user ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          </div>
          {!collapsed && <span className="text-sm font-medium">{user ? 'Sign Out' : 'Sign In'}</span>}
        </button>

        {!collapsed && (
          <div className="mt-3 px-3">
            <p className="text-[10px] text-muted-foreground text-center">
              Powered by AI Assistant
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
