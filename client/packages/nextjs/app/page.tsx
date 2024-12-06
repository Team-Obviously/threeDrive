"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { OktoContextType, useOkto } from "okto-sdk-react";
import { DocumentTextIcon, UserGroupIcon } from "@heroicons/react/24/outline";

const Home: NextPage = () => {
  const { getUserDetails } = useOkto() as OktoContextType;
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserDetails();
        console.log("USERDATA", data);
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [getUserDetails]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center animate-fade-in">
          <h1 className="text-6xl font-bold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">ThreeDrive</span>
          </h1>
          <p className="text-2xl mb-12 text-base-content/80">
            Collaborative document editing, powered by blockchain technology
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-base-100 p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            <DocumentTextIcon className="h-12 w-12 mb-4 text-primary mx-auto" />
            <h2 className="text-xl font-semibold mb-4 text-center">Real-time Collaboration</h2>
            <p className="text-base-content/70 text-center">
              Edit documents simultaneously with your team, with changes synced instantly on-chain
            </p>
          </div>

          <div className="bg-base-100 p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            <UserGroupIcon className="h-12 w-12 mb-4 text-primary mx-auto" />
            <h2 className="text-xl font-semibold mb-4 text-center">Decentralized Access</h2>
            <p className="text-base-content/70 text-center">
              Control document access with wallet addresses and smart contracts
            </p>
          </div>

          <div className="bg-base-100 p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            {/* < className="h-12 w-12 mb-4 text-primary mx-auto" /> */}
            <h2 className="text-xl font-semibold mb-4 text-center">Immutable History</h2>
            <p className="text-base-content/70 text-center">
              Every revision is permanently stored on the blockchain for complete transparency
            </p>
          </div>
        </div>

        <div className="mt-20 text-center">
          <Link href="/documents" className="btn bg-white text-black btn-lg animate-pulse-fast">
            Start Collaborating
          </Link>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-block relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary blur-lg opacity-20 animate-pulse"></div>
            <div className="relative bg-base-100 rounded-xl p-6 shadow-xl">
              <p className="text-lg">Connect your wallet to start creating and editing documents with your team</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
