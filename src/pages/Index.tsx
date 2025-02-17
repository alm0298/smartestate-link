
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

export const Index = () => {
  const { user } = useAuth();

  // If user is authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // For non-authenticated users, show a landing page
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">Welcome to SmartEstate</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Your intelligent property management solution
      </p>
      <a
        href="/auth"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
      >
        Get Started
      </a>
    </div>
  );
};

export default Index;
