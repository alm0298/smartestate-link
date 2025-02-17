
import { Button } from "@/components/ui/button";
import { Menu, Home, UserPlus, Search, LogOut } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/">
              <h1 className="text-xl font-display font-bold text-gray-900">SmartEstate</h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900" asChild>
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {user ? (
              <Button variant="default" className="bg-primary hover:bg-primary/90" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <Button variant="default" className="bg-primary hover:bg-primary/90" asChild>
                <Link to="/auth">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Get Started
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-b border-gray-200">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {user ? (
              <Button
                variant="default"
                className="w-full justify-start bg-primary hover:bg-primary/90"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <Button
                variant="default"
                className="w-full justify-start bg-primary hover:bg-primary/90"
                asChild
              >
                <Link to="/auth">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Get Started
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
