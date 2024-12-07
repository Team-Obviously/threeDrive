"use client";

import { ReactNode, createContext, useContext, useState } from "react";
import { OktoContextType, useOkto } from "okto-sdk-react";

interface UserContextType {
  userEmail: string;
  authToken: string | null;
  setuserEmail: (value: string) => void;
  setAuthToken: (value: string | null) => void;
  handleLogout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userEmail, setuserEmail] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { logOut } = useOkto() as OktoContextType;

  return (
    <UserContext.Provider
      value={{
        userEmail,
        authToken,
        setuserEmail,
        setAuthToken,
        handleLogout: logOut,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
