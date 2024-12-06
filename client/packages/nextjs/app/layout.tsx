"use client";

import { useEffect, useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { GoogleLogin, GoogleOAuthProvider, googleLogout } from "@react-oauth/google";
import { BuildType, OktoContextType, OktoProvider, useOkto } from "okto-sdk-react";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { UserProvider, useUser } from "~~/contexts/UserContext";
import "~~/styles/globals.css";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const OKTO_CLIENT_API_KEY = process.env.NEXT_PUBLIC_OKTO_APP_SECRET;

function Navbar() {
  const { userEmail, setuserEmail, handleLogout } = useUser();

  const { authenticate, getUserDetails, isLoggedIn } = useOkto() as OktoContextType;
  const handleLoginSuccess = (credentialResponse: any) => {
    authenticate(credentialResponse.credential, async (result, error) => {
      if (error) {
        console.error("Authentication error:", error);
        return;
      }
      try {
        const userData = await getUserDetails();
        setuserEmail(userData.email);
      } catch (err) {
        console.error("Error getting user details:", err);
      }
    });
  };

  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserDetails();
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    if (isLoggedIn) {
      fetchUserData();
    }
  }, [isLoggedIn, getUserDetails]);

  return (
    <div className="navbar bg-base-100">
      <div className="navbar-start">
        <a className="btn btn-ghost text-xl">ThreeDrive</a>
      </div>
      <div className="navbar-end">
        {!isLoggedIn ? (
          <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log("Login Failed")} />
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-success">Welcome {userData?.email.split("@")[0]}</span>
            <button onClick={handleLogout} className="btn btn-ghost">
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider enableSystem>
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID!}>
            <OktoProvider apiKey={OKTO_CLIENT_API_KEY!} buildType={BuildType.SANDBOX}>
              <UserProvider>
                <Navbar />
                <main>{children}</main>
              </UserProvider>
            </OktoProvider>
          </GoogleOAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
