import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
  role: "ADMIN" | "SALES_USER";
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loginUser: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

/**
 * Provides authentication state to the entire React application.
 */
export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("erp_token"),
  );

  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      return null;
    }
  });

  /**
   * Stores the JWT and authenticated user after login.
   */
  function loginUser(newToken: string, newUser: User) {
    localStorage.setItem("erp_token", newToken);
    localStorage.setItem(
      "erp_user",
      JSON.stringify(newUser),
    );

    setToken(newToken);
    setUser(newUser);
  }

  /**
   * Clears authentication state.
   */
  function logout() {
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");

    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loginUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Convenient hook for accessing authentication state.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return context;
}