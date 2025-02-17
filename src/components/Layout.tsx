
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/providers/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Building, Users, Settings } from "lucide-react";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen flex dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r">
        <div className="h-full px-3 py-4">
          <div className="mb-8 px-2">
            <h1 className="text-2xl font-bold text-primary">SmartEstate</h1>
            <p className="text-sm text-gray-500">Property Management</p>
          </div>
          <nav className="space-y-1">
            <Link
              to="/"
              className="flex items-center px-2 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
            <Link
              to="/properties"
              className="flex items-center px-2 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Building className="mr-2 h-4 w-4" />
              Properties
            </Link>
            <Link
              to="/clients"
              className="flex items-center px-2 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Users className="mr-2 h-4 w-4" />
              Clients
            </Link>
            <Link
              to="/settings"
              className="flex items-center px-2 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </nav>
          <div className="absolute bottom-4 left-0 right-0 px-3">
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="ml-2">
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
