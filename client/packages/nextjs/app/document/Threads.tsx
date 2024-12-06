"use client";

import { AnchoredThreads, FloatingComposer, FloatingThreads } from "@liveblocks/react-lexical";
import { useThreads } from "@liveblocks/react/suspense";

export function Threads() {
  const { threads } = useThreads();

  return (
    <>
      <div className="anchored-threads">
        <AnchoredThreads threads={threads} />
      </div>
      <FloatingThreads className="floating-threads" threads={threads} />
      <FloatingComposer className="floating-composer" />
    </>
  );
}
