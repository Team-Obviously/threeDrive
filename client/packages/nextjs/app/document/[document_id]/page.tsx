"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Link as LinkIcon, Loader2, Share2 } from "lucide-react";
import { BackwardIcon } from "@heroicons/react/24/outline";
import CodeBlock from "~~/app/components/CodeBlock";
import PdfViewer from "~~/app/components/PdfViewer";
import { Button } from "~~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";
import SparklesText from "~~/components/ui/sparkles-text";
import { useToast } from "~~/hooks/use-toast";
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
  const router = useRouter();
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

    const renderFileDetails = (children: React.ReactNode) => (
      <div className="relative flex flex-col justify-center min-h-screen items-center">
        <div className="max-w-4xl w-auto p-10 mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="relative">{children}</div>
          <div className="p-6 border-t">
            <div className="flex justify-between items-center flex-col gap-2">
              <SparklesText className="text-center text-2xl" text={fileDetails.name} />
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  {(fileDetails.size / 1024).toFixed(2)} KB
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {fileDetails.mimetype}
                </span>
                <div className="mt-4">
                  <FileActions fileDetails={fileDetails} documentId={params.document_id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    if (mimetype === "text/plain" || (mimetype === "application/octet-stream" && fileDetails.name.endsWith(".go"))) {
      return renderFileDetails(
        <TextEditor documentId={params.document_id} initialContent={fileContent || ""} fileName={fileDetails.name} />,
      );
    }

    if (fileDetails.isImage) {
      return renderFileDetails(
        <img src={imageContent!} alt={fileDetails.name} className="w-full h-96 object-contain" />,
      );
    }

    if (mimetype === "application/pdf") {
      return renderFileDetails(<PdfViewer url={fileDetails.downloadUrl} fileName={fileDetails.name} />);
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mb-4">This file type ({mimetype}) cannot be previewed.</p>
        <Button variant="default" asChild>
          <a href={fileDetails.downloadUrl} download={fileDetails.name}>
            <Download className="mr-2 h-4 w-4" />
            Download File
          </a>
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex m-4 justify-start items-center">
        <Button variant="outline" size="lg" onClick={() => router.back()}>
          <BackwardIcon className="h-5 w-5 mr-2" /> Back
        </Button>
      </div>
      {renderContent()}
    </div>
  );
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
    <div className="container mx-auto max-w-6xl bg-[#1e1e1e] shadow-md rounded-lg p-8 my-10">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold mx-2 text-white">Code Editor</h1>
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

// Add new function to handle file actions
const FileActions = ({ fileDetails, documentId }: { fileDetails: FileDetails; documentId: string }) => {
  const { toast } = useToast();

  const handleDownload = () => {
    window.open(fileDetails.downloadUrl, "_blank");
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: fileDetails.name,
        url: window.location.href,
      });
    } catch (err) {
      // Fallback to copying link if Web Share API is not supported
      await navigator.clipboard.writeText(window.location.href);
      toast({
        description: "URL copied to clipboard!",
      });
    }
  };

  const handleWalrusShare = async () => {
    // Generate and copy Walrus-specific sharing link
    const walrusLink = `https://aggregator.walrus-testnet.walrus.space/document/${documentId}`;
    await navigator.clipboard.writeText(walrusLink);
    toast({
      description: "Walrus link copied to clipboard!",
    });
  };

  return (
    <div className="relative flex gap-2">
      <Button variant="outline" size="lg" onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 ">
        <Download className="h-5 w-5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg" className="flex items-center ">
            <Share2 className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleShare} className="py-3 cursor-pointer">
            <Share2 className="mr-3 h-5 w-5" />
            Share Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleWalrusShare} className="py-3 cursor-pointer">
            <LinkIcon className="mr-3 h-5 w-5" />
            Copy Walrus Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
