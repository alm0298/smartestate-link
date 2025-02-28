import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/providers/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/Layout";
import { Auth } from "@/pages/Auth";
import { Dashboard } from "@/pages/Dashboard";
import { Properties } from "@/pages/Properties";
import { PropertyDetails } from "@/pages/PropertyDetails";
import { NewProperty } from "@/pages/NewProperty";
import { Clients } from "@/pages/Clients";
import { Settings } from "@/pages/Settings";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { debug, info, error as loggerError } from '@/lib/logger';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

info('[App] === App Starting ===');
debug('[App] Environment:', {
  NODE_ENV: import.meta.env.MODE,
  BASE_URL: import.meta.env.BASE_URL,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  VITE_API_URL: import.meta.env.VITE_API_URL
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
              <Route path="/properties/new" element={<ProtectedRoute><NewProperty /></ProtectedRoute>} />
              <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetails /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            </Routes>
          </Layout>
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
