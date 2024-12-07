"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, MoreVertical, UserPlus, X } from "lucide-react";
import { DocumentIcon, DocumentPlusIcon, FolderIcon, FolderPlusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "~~/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "~~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";
import { Input } from "~~/components/ui/input";
import { getRequest, postRequest } from "~~/utils/generalService";

interface FileMetadata {
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

interface Collaborator {
  _id: string;
  userId: string;
  addedAt: string;
}

interface FolderItem {
  _id: string;
  name: string;
  path: string;
  isFile: boolean;
  parent: string | null;
  children: FolderItem[];
  metadata: FileMetadata;
  collaborators: Collaborator[];
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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FolderItem | null>(null);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");

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

  const handleShare = async (email: string) => {
    console.log(email);
    console.log(selectedItem?._id);
    try {
      const res = await postRequest(`/walrus/collaborator/${selectedItem?._id}`, {
        emailId: email,
      });
      console.log(res);

      if (res.data.success) {
        const collaborator = res.data.data.collaborator;
        setFolder(prevFolder => {
          if (!prevFolder) return null;
          return {
            ...prevFolder,
            collaborators: [...(prevFolder?.collaborators || []), collaborator],
          };
        });
        // const refreshRes = await getRequest(`/walrus/folder?id=${params.folder_id}`);
        // setFolder(refreshRes.data.data.folder);
        setNewCollaboratorEmail("");
      }
    } catch (err) {
      setError("Failed to share item");
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    try {
      await postRequest(`/walrus/revoke-access`, {
        itemId: selectedItem?._id,
        userId,
      });

      const refreshRes = await getRequest(`/walrus/folder?id=${params.folder_id}`);
      setFolder(refreshRes.data.data.folder);
    } catch (err) {
      setError("Failed to revoke access");
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
          <div key={item._id} className="relative">
            <Link
              href={item.isFile ? `/document/${item._id}` : `/folder/${item._id}`}
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

            <div className="absolute top-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <MoreVertical className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedItem(item);
                      setShowShareDialog(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
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
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share {selectedItem?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Enter email address"
                value={newCollaboratorEmail}
                onChange={e => setNewCollaboratorEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => handleShare(newCollaboratorEmail)} disabled={!newCollaboratorEmail}>
                Share
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">People with access</h3>
              {selectedItem?.collaborators?.map(collaborator => (
                <div
                  key={collaborator._id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                >
                  <div>
                    <p className="text-sm font-medium">User {collaborator.userId}</p>
                    <p className="text-xs text-gray-500">Added {new Date(collaborator.addedAt).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRevokeAccess(collaborator.userId)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
