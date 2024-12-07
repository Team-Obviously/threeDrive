"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import CodeBlock from "~~/app/components/CodeBlock";
import PdfViewer from "~~/app/components/PdfViewer";
import { Button } from "~~/components/ui/button";
import { getRequest, patchRequest, postRequest } from "~~/utils/generalService";

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
  isImage: boolean;
}

export default function DocumentPage({ params }: { params: { document_id: string } }) {
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [imageContent, setImageContent] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileDetails = async () => {
      try {
        const res = await getRequest(`/walrus/file/${params.document_id}/view`);
        console.log("res", res);
        setFileDetails(res.data.data);

        const response = await fetch(res.data.data.downloadUrl);
        const blob = await response.blob();
        const text = await blob.text();

        if (res.data.data.isImage) {
          setImageContent(text);
        } else if (res.data.data.mimetype === "application/pdf") {
          // For PDFs, we keep the base64 string
          setFileContent(text);
        } else {
          setFileContent(text);
        }
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
      return (
        <TextEditor documentId={params.document_id} initialContent={fileContent || ""} fileName={fileDetails.name} />
      );
    }

    if (fileDetails.isImage) {
      return (
        <div className="flex justify-center p-8">
          {imageContent && (
            <img src={imageContent} alt={fileDetails.name} className="max-w-full h-auto rounded-lg shadow-lg" />
          )}
        </div>
      );
    }

    if (mimetype === "application/pdf") {
      return <PdfViewer url={fileDetails.downloadUrl} fileName={fileDetails.name} />;
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mb-4">This file type ({mimetype}) cannot be previewed.</p>
        <a
          href={fileDetails.downloadUrl}
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
function TextEditor({
  documentId,
  initialContent,
  fileName,
}: {
  documentId: string;
  initialContent: string;
  fileName: string;
}) {
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [connectionColor, setConnectionColor] = useState("text-red-500");
  const [lastReceivedContent, setLastReceivedContent] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(initialContent);
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
        setContent(data.content);
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

  const handleEditorInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "content", content: newContent }));
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLPreElement>) => {
    console.log("e", e);
  };

  const getLanguageFromFilename = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "js":
        return "javascript";
      case "css":
        return "css";
      case "html":
        return "markup";
      case "go":
        return "go";
      default:
        return "plaintext";
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const file = new Blob([content], { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", file, fileName);

      await patchRequest(`/walrus/file/${documentId}/content`, formData);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl bg-[#1e1e1e] shadow-md rounded-lg p-8 my-10">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Code Editor</h1>
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
          <div className={`px-4 py-2 rounded ${connectionColor} bg-gray-800`}>
            <span className="font-semibold">{connectionStatus}</span>
          </div>
        </div>
      </header>

      <div className="editor-container">
        <div className="relative">
          <textarea
            ref={editorRef}
            value={content}
            onChange={handleEditorInput}
            className="w-full h-96 p-4 font-mono text-white bg-transparent absolute inset-0 resize-none focus:outline-none"
            placeholder="Start typing here..."
          />
          <CodeBlock code={content} language={getLanguageFromFilename(fileName)} />
        </div>
      </div>
    </div>
  );
}
