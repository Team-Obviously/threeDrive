"use client";

import { useState } from "react";
import { FileGrid } from "@/components/file-explorer/file-grid";
import { Toolbar } from "@/components/file-explorer/toolbar";
import { Breadcrumb, FileItem } from "~~/types/file-system";
import { BreadcrumbNav } from "~~/components/file-explorer/breadcrumn-nav";

export default function Home() {
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<FileItem[]>([
    {
      id: "1",
      name: "Documents",
      type: "folder",
      createdAt: new Date(),
      modifiedAt: new Date(),
      parentId: "root",
    },
    {
      id: "2",
      name: "Images",
      type: "folder",
      createdAt: new Date(),
      modifiedAt: new Date(),
      parentId: "root",
    },
  ]);
  const [path, setPath] = useState<Breadcrumb[]>([]);

  const handleNavigate = (id: string) => {
    setCurrentFolderId(id);
    if (id === "root") {
      setPath([]);
    } else {
      const folder = items.find(item => item.id === id);
      if (folder) {
        setPath(prev => [...prev, { id: folder.id, name: folder.name }]);
      }
    }
  };

  const handleCreateFolder = (name: string) => {
    const newFolder: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      type: "folder",
      createdAt: new Date(),
      modifiedAt: new Date(),
      parentId: currentFolderId,
    };
    setItems(prev => [...prev, newFolder]);
  };

  const handleFileUpload = (file: File) => {
    const newFile: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: "file",
      size: file.size,
      createdAt: new Date(),
      modifiedAt: new Date(),
      parentId: currentFolderId,
    };
    setItems(prev => [...prev, newFile]);
  };

  const filteredItems = items.filter(
    item =>
      item.parentId === currentFolderId &&
      (searchQuery === "" || item.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbNav path={path} onNavigate={handleNavigate} />
      <Toolbar
        currentFolderId={currentFolderId}
        onCreateFolder={handleCreateFolder}
        onFileUpload={handleFileUpload}
        onSearch={setSearchQuery}
      />
      <FileGrid items={filteredItems} onNavigate={handleNavigate} />
    </div>
  );
}
