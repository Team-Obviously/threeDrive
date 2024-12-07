"use client";

import { useEffect, useRef, useState } from "react";
import { getRequest } from "~~/utils/generalService";

interface FileDetails {
  metadata: {
    filename: string;
    mimetype: string;
    size: number;
    uploadedAt: string;
  };
  name: string;
  mimetype: string;
  size: number;
  downloadUrl: string;
}

export default function DocumentPage({ params }: { params: { document_id: string } }) {
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFileDetails = async () => {
      try {
        const res = await getRequest(`/walrus/file/${params.document_id}/view`);
        console.log("res", res);
        setFileDetails(res.data.data);

        // Fetch the actual file content
        const response = await fetch(res.data.data.downloadUrl);
        const blob = await response.blob();
        const text = await blob.text();
        setFileContent(text);
      } catch (err) {
        console.error("Failed to fetch file details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFileDetails();
  }, [params.document_id]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // Render different components based on file type
  const renderContent = () => {
    const mimetype = fileDetails?.mimetype;

    if (!mimetype) return null;

    if (mimetype === "text/plain" || (mimetype === "application/octet-stream" && fileDetails.name.endsWith(".go"))) {
      return <TextEditor documentId={params.document_id} initialContent={fileContent || ""} />;
    }

    if (mimetype.startsWith("image/")) {
      return (
        <div className="flex justify-center p-8">
          <img
            src={URL.createObjectURL(new Blob([fileContent || ""], { type: mimetype }))}
            alt={fileDetails.name}
            className="max-w-full h-auto"
          />
        </div>
      );
    }

    // For other file types, create a download link from the blob
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mb-4">This file type ({mimetype}) cannot be previewed.</p>
        <a
          href={URL.createObjectURL(new Blob([fileContent || ""], { type: mimetype }))}
          download={fileDetails.name}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Download File
        </a>
      </div>
    );
  };

  return <div className="min-h-screen bg-gray-50">{renderContent()}</div>;
}

// Update TextEditor to accept initial content
function TextEditor({ documentId, initialContent }: { documentId: string; initialContent: string }) {
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [connectionColor, setConnectionColor] = useState("text-red-500");
  const [lastReceivedContent, setLastReceivedContent] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Set initial content when component mounts
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.value = initialContent;
    }
  }, [initialContent]);

  useEffect(() => {
    console.log("documentId", documentId);
  }, [documentId]);

  useEffect(() => {
    const docId = documentId;
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
    <div className="container mx-auto max-w-4xl bg-white shadow-md rounded-lg p-8 my-10">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-700">Text Editor</h1>
        <div className={`px-4 py-2 rounded ${connectionColor} bg-gray-100`}>
          <span className="font-semibold">{connectionStatus}</span>
        </div>
      </header>

      <div className="editor-container">
        <textarea
          ref={editorRef}
          onInput={handleEditorInput}
          className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          placeholder="Start typing here..."
        ></textarea>
      </div>
    </div>
  );
}
