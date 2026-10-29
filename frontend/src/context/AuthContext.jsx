import api from "../api/axios";
import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, loginUser } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function login(email, password, otp = "") {
    const data = await loginUser(email, password, otp);

    localStorage.setItem("access_token", data.access_token);

    const currentUser = await getCurrentUser();

    setUser(currentUser);

    return currentUser;
  }

  async function logout(event) {
    if (
      event?.type !== "auth-expired" &&
      localStorage.getItem("access_token")
    ) {
      try {
        await api.post("/security/logout");
      } catch {
        /* Clear the local session even when the server is unreachable. */
      }
    }
    localStorage.removeItem("access_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        setUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
