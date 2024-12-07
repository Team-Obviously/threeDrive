"use client";

import { ReactNode } from "react";
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";

export function Room({ children, document_id }: { children: ReactNode, document_id: string }) {
  return (
    <LiveblocksProvider publicApiKey={"pk_prod_igoTwEdw5Hkf0QnLTL03WyV2F8pAHFJuIfxyQzCzGIx4N24Oyd8n9fcBcoavqw7a"}>
      <RoomProvider id={document_id}>
        <ClientSideSuspense fallback={<div>Loading…</div>}>{children}</ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
