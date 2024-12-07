"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import titleLogo from "../assets/title-logo.png";
import "@rainbow-me/rainbowkit/styles.css";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { BuildType, OktoContextType, OktoProvider, useOkto } from "okto-sdk-react";
import { ThemeProvider } from "~~/components/ThemeProvider";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "~~/components/ui/navigation-menu";
import { UserProvider, useUser } from "~~/contexts/UserContext";
import "~~/styles/globals.css";
import { postRequest } from "~~/utils/generalService";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const OKTO_CLIENT_API_KEY = process.env.NEXT_PUBLIC_OKTO_APP_SECRET;

function Navbar() {
  const { userEmail, setuserEmail, handleLogout } = useUser();
  const { authenticate, getUserDetails, isLoggedIn } = useOkto() as OktoContextType;
  const [userData, setUserData] = useState<any>(null);

  const handleLoginSuccess = async (credentialResponse: any) => {
    try {
      authenticate(credentialResponse.credential, async (result, error) => {
        if (error) {
          console.error("Authentication error:", error);
          return;
        }
      });
    } catch (err) {
      console.error("Error getting user details:", err);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserDetails();
        setUserData(data);
        console.log("User data:", data);
        try {
          const response = await postRequest(`/users`, {
            emailId: data.email,
          });
          setuserEmail(response.data.data.emailId);
          const userId = response.data.data.id;
          localStorage.setItem("userId", userId);
          if (response.statusText != "OK") {
            throw new Error("Failed to create user in backend");
          }
        } catch (apiError) {
          console.error("Error saving user to backend:", apiError);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    if (isLoggedIn) {
      fetchUserData();
    }
  }, [isLoggedIn, getUserDetails]);

  return (
    <div className="fixed mx-4 top-0 w-full z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Logo Section */}
        <div className="mr-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <Image src={titleLogo} className="w-40 h-10" alt="ThreeDrive Logo" />
          </a>
        </div>

        {/* Navigation Section */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink
                className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                href="/drive"
              >
                Files
              </NavigationMenuLink>
            </NavigationMenuItem>
            {/* <NavigationMenuItem>
              <NavigationMenuLink
                className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                href="/files"
              >
                Files
              </NavigationMenuLink>
            </NavigationMenuItem> */}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Auth Section */}
        <div className="flex flex-1 items-center mr-4 justify-end space-x-4">
          {!isLoggedIn && (
            <div className="visible">
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={() => console.log("Login Failed")}
                theme="filled_black"
                shape="pill"
                size="large"
              />
            </div>
          )}
          {isLoggedIn && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-foreground/60">Welcome {userData?.email.split("@")[0]}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Logout
              </button>
            </div>
          )}
        </div>
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
