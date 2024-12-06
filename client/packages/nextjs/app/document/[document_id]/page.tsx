"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import Editor from "./editor";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";

const DocumentEditPage = () => {
  const roomId = useExampleRoomId("liveblocks:tiptap-examples:nextjs");
  return (
    <>
      Hello
      <LiveblocksProvider
        authEndpoint="/api/liveblocks-auth"
        resolveUsers={async ({ userIds }) => {
          const searchParams = new URLSearchParams(userIds.map(userId => ["userIds", userId]));
          const response = await fetch(`/api/users?${searchParams}`);

          if (!response.ok) {
            throw new Error("Problem resolving users");
          }

          const users = await response.json();
          return users;
        }}
        resolveMentionSuggestions={async ({ text }) => {
          const response = await fetch(`/api/users/search?text=${encodeURIComponent(text)}`);

          if (!response.ok) {
            throw new Error("Problem resolving mention suggestions");
          }

          const userIds = await response.json();
          return userIds;
        }}
      >
        <RoomProvider
          id={roomId}
          initialPresence={{
            cursor: null,
          }}
        >
          <Editor />
        </RoomProvider>
      </LiveblocksProvider>
    </>
  );
};

export default DocumentEditPage;

function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const documentId = params?.get("document_id");
  return documentId ? `${roomId}-${documentId}` : roomId;
}
