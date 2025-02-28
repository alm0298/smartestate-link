import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { UserManagement } from "@/components/UserManagement";

// For development purposes, show user management to all users
const SHOW_USER_MANAGEMENT_TO_ALL = true;

export const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Check if user has admin role
  const isAdmin = user?.user_metadata?.role === "admin";
  
  // Show user management if user is admin or if development flag is enabled
  const showUserManagement = isAdmin || SHOW_USER_MANAGEMENT_TO_ALL;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-lg font-medium">{user?.email}</p>
              </div>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
            {user?.user_metadata?.role && (
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="text-lg font-medium capitalize">{user.user_metadata.role}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Show user management based on role or development flag */}
      {showUserManagement && (
        <div className="pt-4">
          <UserManagement />
        </div>
      )}
    </div>
  );
};

export default Settings;
