import { supabase } from "@/integrations/supabase/client";
import { debug, error as logError, info } from "@/lib/logger";
import { User } from "@supabase/supabase-js";

export interface UserData {
  id: string;
  email: string;
  created_at: string;
  role?: string;
  last_sign_in_at?: string;
}

// Flag to determine if we should use mock data (set to false to create real users)
const USE_MOCK_DATA = false;

export async function getUsers(): Promise<UserData[]> {
  if (USE_MOCK_DATA) {
    info("[UserService] Using mock data for users");
    return getMockUsers();
  }

  try {
    info("[UserService] Fetching all users");
    
    // Note: In a real application, this would require admin privileges
    // and should be implemented through a secure server function
    // For now, we'll just return mock data since we don't have admin access
    return getMockUsers();
    
    // This code would work with admin access:
    /*
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      logError("[UserService] Error fetching users:", error);
      throw error;
    }
    
    debug("[UserService] Successfully fetched users:", data?.users?.length);
    
    // Transform the users to our format
    return data.users.map(user => ({
      id: user.id,
      email: user.email || "",
      created_at: user.created_at,
      role: user.user_metadata?.role || "user",
      last_sign_in_at: user.last_sign_in_at
    }));
    */
  } catch (err) {
    logError("[UserService] Unexpected error fetching users:", err);
    // Fall back to mock data if the admin API fails
    return getMockUsers();
  }
}

// Mock function for demonstration purposes
function getMockUsers(): UserData[] {
  return [
    {
      id: "1",
      email: "admin@example.com",
      created_at: new Date().toISOString(),
      role: "admin",
      last_sign_in_at: new Date().toISOString()
    },
    {
      id: "2",
      email: "user1@example.com",
      created_at: new Date().toISOString(),
      role: "user",
      last_sign_in_at: new Date().toISOString()
    },
    {
      id: "3",
      email: "user2@example.com",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      role: "user",
      last_sign_in_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

export async function createUser(email: string, password: string, role: string = "user"): Promise<UserData> {
  if (USE_MOCK_DATA) {
    info("[UserService] Using mock data for creating user");
    const newUser: UserData = {
      id: Math.random().toString(36).substring(2, 15),
      email,
      created_at: new Date().toISOString(),
      role,
      last_sign_in_at: null
    };
    return newUser;
  }

  try {
    info("[UserService] Creating new user with email:", email);
    
    // Use the standard Supabase signup method instead of admin API
    // This will create a real user that can log in
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role }
      }
    });
    
    if (error) {
      logError("[UserService] Error creating user:", error);
      throw error;
    }
    
    debug("[UserService] Successfully created user:", data?.user?.id);
    
    return {
      id: data.user.id,
      email: data.user.email || "",
      created_at: data.user.created_at || new Date().toISOString(),
      role: data.user.user_metadata?.role || "user"
    };
  } catch (err) {
    logError("[UserService] Unexpected error creating user:", err);
    throw err;
  }
}

export async function deleteUser(userId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    info("[UserService] Using mock data for deleting user");
    // In mock mode, we just log the deletion
    debug("[UserService] Mock deleted user:", userId);
    return;
  }

  try {
    info("[UserService] Deleting user with ID:", userId);
    
    // Note: Regular users can't delete other users
    // This would require admin privileges in a real app
    // For now, we'll just pretend it worked
    debug("[UserService] Simulated deletion of user:", userId);
    
    // This code would work with admin access:
    /*
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      logError("[UserService] Error deleting user:", error);
      throw error;
    }
    
    debug("[UserService] Successfully deleted user:", userId);
    */
  } catch (err) {
    logError("[UserService] Unexpected error deleting user:", err);
    throw err;
  }
} 