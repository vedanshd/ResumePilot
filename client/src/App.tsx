import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { PageTransition } from "@/components/page-transition";
import { AnimatePresence } from "framer-motion";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/">
          <PageTransition isVisible={location === "/"}>
            <Landing />
          </PageTransition>
        </Route>
        <Route path="/dashboard">
          <PageTransition isVisible={location === "/dashboard"}>
            <Dashboard />
          </PageTransition>
        </Route>
        <Route>
          <PageTransition isVisible={true}>
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">404 - Page Not Found</h1>
                <p className="text-gray-600">The page you're looking for doesn't exist.</p>
              </div>
            </div>
          </PageTransition>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
