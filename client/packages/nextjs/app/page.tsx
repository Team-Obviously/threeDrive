"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Meteors } from "@/components/ui/meteors";
import type { NextPage } from "next";
import { OktoContextType, useOkto } from "okto-sdk-react";
import { DocumentTextIcon, LockClosedIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import AnimatedGradientText from "~~/components/ui/animated-gradient-text";
import Globe from "~~/components/ui/globe";

// Add via shadcn CLI

const Home: NextPage = () => {
  const { getUserDetails } = useOkto() as OktoContextType;
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

    fetchUserData();
  }, [getUserDetails]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <Globe className="opacity-70" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center animate-fade-in space-y-8">
            <div className="flex items-center justify-center gap-4">
              <AnimatedGradientText className="text-7xl font-bold">
                ThreeDrive{" "}
                <img
                  src="https://cdn-icons-png.flaticon.com/128/5968/5968523.png"
                  alt="ThreeDrive logo"
                  className="h-16 ml-4 mt-2 w-16"
                />
              </AnimatedGradientText>
            </div>
            <p className="text-2xl text-base-content/80 max-w-2xl mx-auto">
              Collaborative document editing, powered by blockchain technology
            </p>

            <div className="relative inline-block">
              <Link
                href="/folder/null"
                className="relative inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-primary rounded-xl overflow-hidden transition-transform hover:scale-105"
              >
                Start Collaborating
                <Meteors number={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="group relative overflow-hidden rounded-2xl bg-base-100 p-8 hover:shadow-xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <DocumentTextIcon className="h-12 w-12 mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-4">Real-time Collaboration</h2>
            <p className="text-base-content/70">
              Edit documents simultaneously with your team, with changes synced instantly on-chain
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-base-100 p-8 hover:shadow-xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <UserGroupIcon className="h-12 w-12 mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-4">Decentralized Access</h2>
            <p className="text-base-content/70">Control document access with wallet addresses and smart contracts</p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-base-100 p-8 hover:shadow-xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <LockClosedIcon className="h-12 w-12 mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-4">Immutable History</h2>
            <p className="text-base-content/70">
              Every revision is permanently stored on the blockchain for complete transparency
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
