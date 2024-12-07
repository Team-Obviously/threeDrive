"use client";

import { useState } from "react";
import { UploadButton } from "./upload-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FolderPlus, Search } from "lucide-react";

interface ToolbarProps {
  currentFolderId: string;
  onCreateFolder: (name: string) => void;
  onFileUpload: (file: File) => void;
  onSearch: (query: string) => void;
}

export function Toolbar({ currentFolderId, onCreateFolder, onFileUpload, onSearch }: ToolbarProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center space-x-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
              />
              <Button onClick={handleCreateFolder}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
        <UploadButton currentFolderId={currentFolderId} onFileUpload={onFileUpload} />
      </div>
      <div className="relative w-full max-w-sm ml-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search files and folders..." className="pl-8" onChange={e => onSearch(e.target.value)} />
      </div>
    </div>
  );
}
