"use client";

import { useEffect, useState } from "react";
import { BreadcrumbNav } from "@/components/file-explorer/breadcrumn-nav";
import { FileGrid } from "@/components/file-explorer/file-grid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildBreadcrumbs, fetchFiles, findItemById } from "@/lib/api";
import { Download, FolderPlus, Plus, Search, Share, Trash2, Upload } from "lucide-react";
import { Breadcrumb, FileSystemItem } from "~~/types/file-system";
import { UploadButton } from "~~/components/file-explorer/upload-button";

export default function Home() {
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [path, setPath] = useState<Breadcrumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string>("root/");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    const loadFiles = async () => {
      const files = await fetchFiles();
      console.log("files", files);
      setItems(files);
      setLoading(false);
    };
    loadFiles();
  }, []);

  const getCurrentItems = (): FileSystemItem[] => {
    if (currentFolderId === "root") return items;
    const currentFolder = findItemById(items, currentFolderId);
    return currentFolder?.children || [];
  };

  const handleNavigate = (id: string) => {
    setCurrentFolderId(id);
    if (id === "root") {
      setPath([]);
      setCurrentPath("root/");
    } else {
      const breadcrumbs = buildBreadcrumbs(items, id);
      setPath(breadcrumbs);
      const folder = findItemById(items, id);
      if (folder) {
        setCurrentPath(`root/${folder.name}/`);
      }
    }
  };

  const filteredItems = getCurrentItems().filter(
    item => searchQuery === "" || item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleUploadComplete = async () => {
    // Refresh the file list
    const files = await fetchFiles();
    setItems(files);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center mt-20 justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-14 left-0 right-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-6 h-12">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium">Assets</h1>
          </div>
        </div>
      </div>

      <div className="min-h-screen pt-28 bg-background">
        <div className="px-6">
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search files..."
                className="pl-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <UploadButton 
              currentPath={currentPath} 
              onUploadComplete={handleUploadComplete}
            />
          </div>

          <div className="text-sm text-gray-500 mb-4">{currentPath}</div>
          <FileGrid items={filteredItems} onNavigate={handleNavigate} />
        </div>
      </div>
    </div>
  );
}
