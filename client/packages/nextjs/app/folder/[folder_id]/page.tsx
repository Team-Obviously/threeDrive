"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { ArrowLeft, Copy, Loader2, MoreVertical, RefreshCw, UserPlus, X } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~~/components/ui/table";
import { useToast } from "~~/hooks/use-toast";
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
  blobId?: string;
}

export default function FolderPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [folder, setFolder] = useState<FolderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FolderItem | null>(null);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
  const [showConfetti, setShowConfetti] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FolderItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const truncateBlobId = (blobId: string) => {
    if (!blobId) return "";
    if (blobId.length <= 8) return blobId;
    return `${blobId.slice(0, 4)}...${blobId.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "The blob ID has been copied to your clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  const fetchFolder = async () => {
    try {
      setLoading(true);
      const folderId = pathname.endsWith("root") ? "null" : params.folder_id;
      const res = await getRequest(`/walrus/folder?id=${folderId}`);
      setFolder(res.data.data.folder);
    } catch (err) {
      toast({
        title: "Error loading folder",
        description: "Could not load folder contents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchFolder();
  }, [params.folder_id, pathname]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsSearching(params.get('search') === 'true');
  }, [pathname]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || uploading) return;

    const file = files[0];
    setUploadingFile(file);

    try {
      setUploading(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append("file", file);
      const folderId = pathname.endsWith("root") ? "null" : (params.folder_id as string);
      formData.append("parentFolderId", folderId);

      const res = await postRequest("/walrus/", formData);

      if (res.data.success) {
        await fetchFolder();
        toast({
          title: "Upload successful",
          description: `${file.name} has been uploaded successfully`,
        });
      }
    } catch (err) {
      toast({
        title: "Upload failed",
        description: "Could not upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      handleConfetti();
      setUploading(false);
      setUploadProgress(0);
      setUploadingFile(null);
      setShowDropdown(false);
      // Reset the input
      event.target.value = "";
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const folderId = pathname.endsWith("root") ? "null" : params.folder_id;
      const res = await postRequest(`/walrus/folder`, {
        name: newFolderName,
        parentObjectId: folderId,
      });
      setFolder(res.data.data.folder);
      setNewFolderName("");
      setShowNewFolderDialog(false);
      setShowDropdown(false);
      toast({
        title: "Folder created",
        description: `Folder "${newFolderName}" has been created`,
      });
    } catch (err) {
      toast({
        title: "Error creating folder",
        description: "Could not create folder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (email: string) => {
    try {
      const res = await postRequest(`/walrus/collaborator/${selectedItem?._id}`, {
        emailId: email,
      });

      if (res.data.success) {
        const collaborator = res.data.data.collaborator;
        setFolder(prevFolder => {
          if (!prevFolder) return null;
          return {
            ...prevFolder,
            collaborators: [...(prevFolder?.collaborators || []), collaborator],
          };
        });
        setNewCollaboratorEmail("");
        toast({
          title: "Share successful",
          description: `Successfully shared with ${email}`,
        });
      }
    } catch (err) {
      toast({
        title: "Share failed",
        description: "Could not share item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    try {
      await postRequest(`/walrus/revoke-access`, {
        itemId: selectedItem?._id,
        userId,
      });

      const folderId = pathname.endsWith("root") ? "null" : params.folder_id;
      const refreshRes = await getRequest(`/walrus/folder?id=${folderId}`);
      setFolder(refreshRes.data.data.folder);
      toast({
        title: "Access revoked",
        description: "Successfully revoked access",
      });
    } catch (err) {
      toast({
        title: "Error revoking access",
        description: "Could not revoke access. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (folder?.parent) {
      router.push(`/folder/${folder.parent}`);
    } else {
      router.push("/folder/root");
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0 || uploading) return;

    const file = files[0];
    setUploadingFile(file);

    try {
      setUploading(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append("file", file);
      const folderId = pathname.endsWith("root") ? "null" : (params.folder_id as string);
      formData.append("parentFolderId", folderId);

      await postRequest("/walrus/", formData);

      await fetchFolder();
      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully`,
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: "Could not upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      handleConfetti();
      setUploading(false);
      setUploadProgress(0);
      setUploadingFile(null);
    }
  };

  if (loading) {
    return <div className="mt-20 flex justify-center">Loading...</div>;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleConfetti = () => {
    const end = Date.now() + 3 * 1000; // 3 seconds
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
      });

      requestAnimationFrame(frame);
    };

    frame();
  };

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      const newUrl = window.location.pathname;
      window.history.pushState({}, "", newUrl);
      return;
    }

    setIsSearching(true);
    const params = new URLSearchParams(window.location.search);
    params.set("search", "true");

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", newUrl);

    const res = await getRequest(`/walrus/search?query=${searchQuery}`);
    setSearchResults(res.data.data.files);
  };

  return (
    <div
      className="mt-10 px-8 relative min-h-screen"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {(isDragging || uploading) && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-lg z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg text-center">
            {uploading ? (
              <>
                <div className="flex items-center justify-center mb-2">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <p className="text-lg font-medium">Uploading {uploadingFile?.name}...</p>
                </div>
                <p className="text-sm text-gray-500">Please wait</p>
              </>
            ) : (
              <p className="text-lg font-medium">{isDragging ? "Drop your file here to upload" : "Processing..."}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold">{folder?.path}</h1>
        </div>

        <div className="relative flex flex-row gap-4">
          <Button className="" variant="default" size="icon" onClick={fetchFolder}>
            <RefreshCw className="h-6 w-6" />
          </Button>
          <Button
            className="flex items-center"
            variant="default"
            size="icon"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <PlusIcon className="h-5 w-5 " />
          </Button>

          {showDropdown && (
            <div className="absolute right-0 mt-12 w-48 bg-white rounded-md shadow-lg z-10 border">
              <div className="py-1">
                <div className="flex justify-end px-2 py-1">
                  <button onClick={() => setShowDropdown(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    const fileInput = document.getElementById("file-upload");
                    if (fileInput) {
                      fileInput.click();
                    }
                  }}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <div className="flex items-center">
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
                  </div>
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
      <form onSubmit={handleSearch} className="flex items-center gap-4">
        <Input
          type="text"
          placeholder="Search files..."
          className="pl-3 pr-10"
          onChange={e => setSearchQuery(e.target.value)}
        />
        <Button variant="default" type="submit">
          Search
        </Button>
      </form>

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Blob ID</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isSearching
              ? searchResults.map(item => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <Link
                        href={item.isFile ? `/document/${item._id}` : `/folder/${item._id}`}
                        className="flex items-center space-x-2 hover:text-blue-500"
                      >
                        {item.isFile ? (
                          <DocumentIcon className="h-5 w-5 text-blue-500" />
                        ) : (
                          <FolderIcon className="h-5 w-5 text-yellow-500" />
                        )}
                        <span>{item.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{item.isFile ? "File" : "Folder"}</TableCell>
                    <TableCell>
                      {item.isFile ? formatFileSize(item.metadata.size) : `${item.children.length} items`}
                    </TableCell>
                    <TableCell>
                      {item.blobId && (
                        <div className="flex items-center space-x-2">
                          <span>{truncateBlobId(item.blobId)}</span>
                          <button
                            onClick={() => copyToClipboard(item.blobId || "")}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              : folder?.children.map(item => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <Link
                        href={item.isFile ? `/document/${item._id}` : `/folder/${item._id}`}
                        className="flex items-center space-x-2 hover:text-blue-500"
                      >
                        {item.isFile ? (
                          <DocumentIcon className="h-5 w-5 text-blue-500" />
                        ) : (
                          <FolderIcon className="h-5 w-5 text-yellow-500" />
                        )}
                        <span>{item.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{item.isFile ? "File" : "Folder"}</TableCell>
                    <TableCell>
                      {item.isFile ? formatFileSize(item.metadata.size) : `${item.children.length} items`}
                    </TableCell>
                    <TableCell>
                      {item.blobId && (
                        <div className="flex items-center space-x-2">
                          <span>{truncateBlobId(item.blobId)}</span>
                          <button
                            onClick={() => copyToClipboard(item.blobId || "")}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {((isSearching && searchResults.length === 0) || (!isSearching && folder?.children.length === 0)) && (
          <div className="text-center text-gray-500 mt-8">
            {isSearching ? "No search results found" : "This folder is empty"}
          </div>
        )}
      </div>

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
