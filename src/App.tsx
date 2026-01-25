import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
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
                <DashboardLayout>
                  <Sessions />
                </DashboardLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
