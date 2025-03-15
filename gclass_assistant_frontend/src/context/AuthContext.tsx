// AuthContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
// Define the shape of the user object
interface User {
  name: string;
  email: string;
}

// Define the shape of the authentication context
interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  user?: User;
  setUser: (user: User | undefined) => void;
}

// Create the authentication context with an undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component to wrap around parts of the app that need access to authentication state
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // State to track if the user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | undefined>(undefined);
  return (
    // Provide the authentication state and setter function to the context
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, user, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the authentication context
export const useAuth = (): AuthContextType => {
  // Get the context value
  const context = useContext(AuthContext);
  // Throw an error if the hook is used outside of an AuthProvider
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
