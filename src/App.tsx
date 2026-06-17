import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RoleProvider } from "@/hooks/useRole";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Voice from "./pages/Voice";
import Scan from "./pages/Scan";
import Flashcards from "./pages/Flashcards";
import Sessions from "./pages/Sessions";
import Quiz from "./pages/Quiz";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import Learn from "./pages/Learn";
import Games from "./pages/Games";
import NotFound from "./pages/NotFound";
// New feature pages
import AdminDashboard from "./pages/AdminDashboard";
import MentorDashboard from "./pages/MentorDashboard";
import StudyPlanner from "./pages/StudyPlanner";
import Analytics from "./pages/Analytics";
import Documents from "./pages/Documents";
import MockTests from "./pages/MockTests";
import Syllabus from "./pages/Syllabus";
import Classrooms from "./pages/Classrooms";
import CodingPractice from "./pages/CodingPractice";
import Dashboard from "./pages/Dashboard";
import Vocabulary from "./pages/Vocabulary";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RoleProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/dashboard"
                  element={
                    <DashboardLayout>
                      <Dashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <DashboardLayout>
                      <Chat />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/learn"
                  element={
                    <DashboardLayout>
                      <Learn />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/vocabulary"
                  element={
                    <DashboardLayout>
                      <Vocabulary />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/community"
                  element={
                    <DashboardLayout>
                      <Community />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/voice"
                  element={
                    <DashboardLayout>
                      <Voice />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/scan"
                  element={
                    <DashboardLayout>
                      <Scan />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/quiz"
                  element={
                    <DashboardLayout>
                      <Quiz />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/flashcards"
                  element={
                    <DashboardLayout>
                      <Flashcards />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/games"
                  element={
                    <DashboardLayout>
                      <Games />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/sessions"
                  element={
                    <DashboardLayout requireAuth>
                      <Sessions />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <DashboardLayout requireAuth>
                      <Profile />
                    </DashboardLayout>
                  }
                />
                {/* New Feature Routes */}
                <Route
                  path="/study-planner"
                  element={
                    <DashboardLayout>
                      <StudyPlanner />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <DashboardLayout requireAuth>
                      <Analytics />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/documents"
                  element={
                    <DashboardLayout>
                      <Documents />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/mock-tests"
                  element={
                    <DashboardLayout>
                      <MockTests />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/syllabus"
                  element={
                    <DashboardLayout>
                      <Syllabus />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/classrooms"
                  element={
                    <DashboardLayout>
                      <Classrooms />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/coding"
                  element={
                    <DashboardLayout>
                      <CodingPractice />
                    </DashboardLayout>
                  }
                />

                {/* Role-specific dashboards */}
                <Route
                  path="/admin"
                  element={
                    <DashboardLayout requiredRole="admin">
                      <AdminDashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/mentor"
                  element={
                    <DashboardLayout requiredRole="mentor">
                      <MentorDashboard />
                    </DashboardLayout>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </RoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

