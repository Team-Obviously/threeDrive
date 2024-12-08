"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, MoreVertical } from "lucide-react";
import { DocumentIcon } from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~~/components/ui/table";
import { getRequest } from "~~/utils/generalService";

interface SharedFile {
  _id: string;
  name: string;
  path: string;
  isFile: boolean;
  parent: string;
  blobId: string;
  metadata: {
    filename: string;
    mimetype: string;
    size: number;
    uploadedAt: string;
  };
  collaborators: {
    userId: string;
    addedAt: string;
    _id: string;
  }[];
}

export default function Shared() {
  const router = useRouter();
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getAllSharedFiles = async () => {
      try {
        const res = await getRequest("/walrus/shared-with-me");
        console.log(res.data.data.files);
        // if (res.data.success) {
        setSharedFiles(res.data.data.files);
        // }
      } catch (error) {
        console.error("Failed to fetch shared files:", error);
      } finally {
        setLoading(false);
      }
    };
    getAllSharedFiles();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Shared On</TableHead>
            <TableHead>Blob ID</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sharedFiles.map(file => (
            <TableRow key={file._id}>
              <TableCell>
                <Link href={`/document/${file._id}`} className="flex items-center space-x-2 hover:text-blue-500">
                  <DocumentIcon className="h-5 w-5 text-blue-500" />
                  <span>{file.name}</span>
                </Link>
              </TableCell>
              <TableCell>{formatFileSize(file.metadata.size)}</TableCell>
              <TableCell>{new Date(file.metadata.uploadedAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <span>{file.blobId.slice(0, 8)}...</span>
                  <button onClick={() => copyToClipboard(file.blobId)} className="p-1 hover:bg-gray-100 rounded">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <MoreVertical className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => window.open(`/document/${file._id}`, "_blank")}>
                      Open in new tab
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {sharedFiles.length === 0 && (
        <div className="text-center text-gray-500 mt-8">No files have been shared with you yet</div>
      )}
    </div>
  );
}
