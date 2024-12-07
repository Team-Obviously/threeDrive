"use client";

import { useEffect, useRef, useState } from "react";

export default function EditorPage({ params }: { params: { document_id: string } }) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [connectionColor, setConnectionColor] = useState("text-red-500");
  const [lastReceivedContent, setLastReceivedContent] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const docId = params.document_id;
    setDocumentId(docId);
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/ws/${docId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("Connected");
      setConnectionColor("text-green-500");
    };

    ws.onclose = () => {
      setConnectionStatus("Disconnected");
      setConnectionColor("text-red-500");
    };

    ws.onerror = () => {
      setConnectionStatus("Error");
      setConnectionColor("text-red-500");
    };

    ws.onmessage = event => {
      const data = JSON.parse(event.data);
      if (data.type === "content" && editorRef.current) {
        setLastReceivedContent(data.content);
        const currentCursor = editorRef.current.selectionStart;
        editorRef.current.value = data.content;
        editorRef.current.setSelectionRange(currentCursor, currentCursor);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const sendContent = debounce(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && editorRef.current) {
      const content = editorRef.current.value;
      if (content !== lastReceivedContent) {
        wsRef.current.send(JSON.stringify({ type: "content", content }));
      }
    }
  }, 100);

  const handleEditorInput = () => {
    sendContent();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <div className="container mx-auto max-w-4xl bg-white shadow-md rounded-lg p-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-700">Collaborative Editor</h1>
          <div className={`px-4 py-2 rounded ${connectionColor} bg-gray-100`}>
            <span id="connection-status" className="font-semibold">
              {connectionStatus}
            </span>
          </div>
        </header>

        <div className="mb-4 text-sm text-gray-500">
          Document ID:{" "}
          <span id="document-id" className="font-mono px-2 py-1 bg-gray-200 rounded">
            {documentId}
          </span>
        </div>

        <div className="editor-container">
          <textarea
            id="editor"
            ref={editorRef}
            onInput={handleEditorInput}
            className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Start typing here..."
          ></textarea>
        </div>

        <p className="mt-4 text-gray-400 text-sm">Changes are automatically saved and synchronized in real time.</p>
      </div>
    </div>
  );
}
