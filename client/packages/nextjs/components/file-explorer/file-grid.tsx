"use client";

import { Card } from "@/components/ui/card";
import { FileIcon, FolderIcon } from "lucide-react";
import { FileItem } from "~~/types/file-system";

interface FileGridProps {
  items: FileItem[];
  onNavigate: (id: string) => void;
}

export function FileGrid({ items, onNavigate }: FileGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4">
      {items.map(item => (
        <Card
          key={item.id}
          className="p-4 hover:bg-accent cursor-pointer transition-colors"
          onClick={() => onNavigate(item.id)}
        >
          <div className="flex flex-col items-center space-y-2">
            {item.type === "folder" ? (
              <FolderIcon className="h-12 w-12 text-blue-500" />
            ) : (
              <FileIcon className="h-12 w-12 text-gray-500" />
            )}
            <span className="text-sm font-medium text-center break-all">{item.name}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
