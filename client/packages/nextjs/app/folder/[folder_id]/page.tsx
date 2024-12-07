"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DocumentIcon, DocumentPlusIcon, FolderIcon, FolderPlusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "~~/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "~~/components/ui/dialog";
import { Input } from "~~/components/ui/input";
import { getRequest, postRequest } from "~~/utils/generalService";

interface FileMetadata {
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

interface FolderItem {
  _id: string;
  name: string;
  path: string;
  isFile: boolean;
  parent: string | null;
  children: FolderItem[];
  metadata: FileMetadata;
}

export default function FolderPage() {
  const params = useParams();
  const [folder, setFolder] = useState<FolderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);

  useEffect(() => {
    const fetchFolder = async () => {
      try {
        setLoading(true);
        const res = await getRequest(`/walrus/folder?id=${params.folder_id}`);
        console.log(res);
        setFolder(res.data.data.folder);
        setError(null);
      } catch (err) {
        setError("Failed to load folder contents");
      } finally {
        setLoading(false);
      }
    };
    fetchFolder();
  }, [params.folder_id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("parentFolderId", params.folder_id as string);

      await postRequest("/walrus/", formData);

      // Refresh folder contents after upload
      const refreshRes = await getRequest(`/walrus/folder?id=${params.folder_id}`);
      setFolder(refreshRes.data.data.folder);
    } catch (err) {
      setError("Failed to upload file");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await postRequest("/walrus/folder", {
        name: newFolderName,
        parentId: params.folder_id,
      });
      const res = await postRequest(`/walrus/folder`, {
        name: newFolderName,
        parentId: params.folder_id,
      });
      setFolder(res.data.data.folder);
      setNewFolderName("");
      setShowNewFolderDialog(false);
      setShowDropdown(false);
    } catch (err) {
      setError("Failed to create folder");
    }
  };

  if (loading) {
    return <div className="mt-20 flex justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="mt-20 text-center text-red-500">{error}</div>;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="mt-20 px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{folder?.name || "Loading..."}</h1>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
              <div className="py-1">
                <div className="px-4 py-2 hover:bg-gray-100">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`flex items-center cursor-pointer ${uploading ? "opacity-50" : ""}`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <DocumentPlusIcon className="h-5 w-5 mr-2" />
                        Upload File
                      </>
                    )}
                  </label>
                </div>

                <div
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setShowNewFolderDialog(true);
                    setShowDropdown(false);
                  }}
                >
                  <div className="flex items-center">
                    <FolderPlusIcon className="h-5 w-5 mr-2" />
                    <span>New Folder</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {uploading && (
            <div className="absolute left-0 right-0 -bottom-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>
      </div>
      `{" "}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {folder?.children.map(item => (
          <Link
            href={item.isFile ? `/document/${item._id}` : `/folder/${item._id}`}
            key={item._id}
            className="p-4 border rounded-lg hover:bg-gray-100 transition-colors duration-200 flex flex-col items-center"
          >
            {item.isFile ? (
              <DocumentIcon className="h-12 w-12 text-blue-500" />
            ) : (
              <FolderIcon className="h-12 w-12 text-yellow-500" />
            )}
            <span className="mt-2 text-sm font-medium text-center">{item.name}</span>
            <span className="mt-1 text-xs text-gray-500">
              {item.isFile ? formatFileSize(item.metadata.size) : `${item.children.length} items`}
            </span>
            {/* <span className="mt-1 text-xs text-gray-500">{formatDate(item.metadata.uploadedAt)}</span> */}
          </Link>
        ))}
      </div>
      {folder?.children.length === 0 && <div className="text-center text-gray-500 mt-8">This folder is empty</div>}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
