import {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
} from "@/types/auth";

// Constants for localStorage keys
const USER_STORAGE_KEY = "als_user";
const TOKEN_STORAGE_KEY = "als_token";
const USERS_STORAGE_KEY = "als_users";
const USER_ROLE_KEY = "als_user_role";
const ASSIGNED_BARANGAY_KEY = "als_assigned_barangay";

// In-memory fallback for when storage is blocked
let memoryStorage: Record<string, string> = {};

class AuthService {
  /**
   *
   * @param credentials User login credentials
   * @returns Promise with auth response containing user and token
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const url = `${baseUrl}/api/auth/login`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    // Check if response is ok before parsing JSON
    if (!res.ok) {
      // Try to get error message from response
      let errorMessage = "Login failed";
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If response is not JSON (e.g., HTML error page), use status text
        errorMessage = res.statusText || `Server error (${res.status})`;
      }
      throw new Error(errorMessage);
    }

    let response = await res.json();

    if (!response.success) {
      throw new Error(response.error || "Login failed");
    }

    let user: User = response.data;

    // Generate a mock token
    const token = `mock-jwt-token-${Date.now()}`;

    // Optimize storage operations by batching them
    const storageType = credentials.rememberMe
      ? "localStorage"
      : "sessionStorage";
    const cookieMaxAge = credentials.rememberMe ? "; max-age=2592000" : ""; // 30 days if remember me

    // Store user data using safe methods
    this.safeSetItem(USER_STORAGE_KEY, JSON.stringify(user), storageType);
    this.safeSetItem(TOKEN_STORAGE_KEY, token, storageType);
    this.safeSetItem(USER_ROLE_KEY, user.role, storageType);

    if (user.assignedBarangayId) {
      this.safeSetItem(
        ASSIGNED_BARANGAY_KEY,
        user.assignedBarangayId,
        storageType
      );
    }

    // Set cookies for middleware access (must be set individually)
    document.cookie = `${TOKEN_STORAGE_KEY}=${token}; path=/${cookieMaxAge}`;
    document.cookie = `${USER_ROLE_KEY}=${user.role}; path=/${cookieMaxAge}`;

    if (user.assignedBarangayId) {
      document.cookie = `${ASSIGNED_BARANGAY_KEY}=${user.assignedBarangayId}; path=/${cookieMaxAge}`;
    }

    return { user, token };
  }

  /**
   * Simulates a registration API call
   *
   * @param userData User registration data
   * @returns Promise with auth response containing user and token
   */
  async register(userData: RegisterCredentials): Promise<void> {
    const users = await this.getStoredUsers();

    // Check if email already exists
    if (users.some((u) => u.email === userData.email)) {
      throw new Error("Email already in use");
    }

    // Create new user
    const newUser: Omit<User, "_id"> = {
      email: userData.email,
      password: userData.password,
      name: `${userData.lastName}, ${userData.firstName} ${
        userData.middleName || ""
      }`.trim(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      middleName: userData.middleName,
      gender: userData.gender,
      birthday: userData.birthday,
      role: userData.role || "admin", // Default to regular admin if not specified
      assignedBarangayId: userData.assignedBarangayId, // Only for regular admins
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save user to MongoDB Database
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const url = `${baseUrl}/api/auth/register`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newUser),
    });

    // Check if response is ok before parsing JSON
    if (!res.ok) {
      let errorMessage = "Registration failed";
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = res.statusText || `Server error (${res.status})`;
      }
      throw new Error(errorMessage);
    }

    let response = await res.json();

    if (!response.success) {
      throw new Error(response.error || "Register failed");
    }
  }

  async logout(): Promise<void> {
    this.safeRemoveItem(USER_STORAGE_KEY);
    this.safeRemoveItem(TOKEN_STORAGE_KEY);
    this.safeRemoveItem(USER_ROLE_KEY);
    this.safeRemoveItem(ASSIGNED_BARANGAY_KEY);

    // Clear cookies
    document.cookie = `${TOKEN_STORAGE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${USER_ROLE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${ASSIGNED_BARANGAY_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  /**
   * Gets the current authenticated user
   *
   * @returns The current user or null if not authenticated
   */
  getCurrentUser(): User | null {
    try {
      // Try localStorage first, then sessionStorage
      const userJson = this.safeGetItem(USER_STORAGE_KEY);

      if (!userJson) {
        return null;
      }

      return JSON.parse(userJson) as User;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Gets the current authentication token
   *
   * @returns The current token or null if not authenticated
   */
  getToken(): string | null {
    try {
      // Try localStorage first, then sessionStorage
      return this.safeGetItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  /**
   * Checks if the user is authenticated
   *
   * @returns True if authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  // Cache for stored users to avoid repeated parsing
  private cachedUsers: User[] | null = null;

  /**
   * Helper method to get stored users with caching for better performance
   *
   * @returns Array of stored users
   */
  async getStoredUsers(): Promise<User[]> {
    try {
      // Replace with actual API endpoint for fetching users if needed
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const url = `${baseUrl}/api/auth/users`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ authKey: process.env.NEXT_PUBLIC_AUTHKEY }),
      });

      if (!res.ok) {
        console.error(`Failed to fetch users: ${res.status} ${res.statusText}`);
        return [];
      }

      const response = await res.json();

      const users = response.data as User[];
      this.cachedUsers = users;
      return users;
    } catch (error) {
      console.error("Error getting stored users:", error);
      return [];
    }
  }

  /**
   * Updates a user in the stored users list
   *
   * @param updatedUser Partial user data to update
   * @returns True if update was successful, false otherwise
   */
  async updateStoredUser(updatedUser: Partial<User>): Promise<boolean> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const url = `${baseUrl}/api/auth/users`;
      
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authKey: process.env.NEXT_PUBLIC_AUTHKEY,
          user: updatedUser,
        }),
      });

      if (!res.ok) {
        let errorMessage = "Update failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = res.statusText || `Server error (${res.status})`;
        }
        throw new Error(errorMessage);
      }

      const response = await res.json();

      if (!response.success) {
        throw new Error(response.error);
      }

      return true;
    } catch (error) {
      console.error("Error updating stored users:", error);
      return false;
    }
  }

  /**
   * Deletes a user from the stored users list
   *
   * @param userId ID of the user to delete
   * @returns True if deletion was successful, false otherwise
   */
  async deleteStoredUser(userId: string): Promise<boolean> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const url = `${baseUrl}/api/auth/users`;
      
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authKey: process.env.NEXT_PUBLIC_AUTHKEY,
          user: { _id: userId },
        }),
      });

      if (!res.ok) {
        let errorMessage = "Delete failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = res.statusText || `Server error (${res.status})`;
        }
        throw new Error(errorMessage);
      }

      const response = await res.json();

      if (!response.success) {
        throw new Error(response.error);
      }

      return true;
    } catch (error) {
      console.error("Error deleting stored users:", error);
      return false;
    }
  }
  /**
   * Safe method to get items from storage with fallback
   * @param key Storage key
   * @param preferredStorage Preferred storage type
   * @returns Value or null if not found or error
   */
  private safeGetItem(
    key: string,
    preferredStorage?: "localStorage" | "sessionStorage"
  ): string | null {
    try {
      // Try preferred storage first
      if (preferredStorage === "localStorage") {
        return localStorage.getItem(key);
      } else if (preferredStorage === "sessionStorage") {
        return sessionStorage.getItem(key);
      }

      // Try localStorage first, then sessionStorage
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (error) {
      console.warn(
        `Storage blocked for key ${key}, using memory fallback:`,
        error
      );
      // Fallback to memory storage
      return memoryStorage[key] || null;
    }
  }

  /**
   * Safe method to set items in storage with fallback
   * @param key Storage key
   * @param value Value to store
   * @param preferredStorage Preferred storage type
   */
  private safeSetItem(
    key: string,
    value: string,
    preferredStorage?: "localStorage" | "sessionStorage"
  ): void {
    try {
      if (preferredStorage === "localStorage") {
        localStorage.setItem(key, value);
      } else if (preferredStorage === "sessionStorage") {
        sessionStorage.setItem(key, value);
      } else {
        // Try localStorage first, fallback to sessionStorage
        try {
          localStorage.setItem(key, value);
        } catch (localError) {
          console.warn(
            "localStorage failed, trying sessionStorage:",
            localError
          );
          sessionStorage.setItem(key, value);
        }
      }
      // Also store in memory as backup
      memoryStorage[key] = value;
    } catch (error) {
      console.warn(
        `Storage blocked for key ${key}, using memory fallback:`,
        error
      );
      // Fallback to memory storage only
      memoryStorage[key] = value;
    }
  }

  /**
   * Safe method to remove items from storage
   * @param key Storage key
   */
  private safeRemoveItem(key: string): void {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing storage for key ${key}:`, error);
    }
    // Always remove from memory storage
    delete memoryStorage[key];
  }
}

// Export a singleton instance
export const authService = new AuthService();
