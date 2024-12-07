"use client";

import { Card } from "@/components/ui/card";
import { formatFileSize } from "@/lib/utils";
import { type FileSystemItem } from "@/types/file-system";
import { formatDistanceToNow } from "date-fns";
import { FileIcon, FolderIcon } from "lucide-react";

interface FileGridProps {
  items: FileSystemItem[];
  onNavigate: (id: string) => void;
}

export function FileGrid({ items, onNavigate }: FileGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4">
      {items.map(item => (
        <Card
          key={item._id}
          className="p-4 hover:bg-accent cursor-pointer transition-colors"
          onClick={() => onNavigate(item._id)}
        >
          <div className="flex flex-col items-center space-y-2">
            {!item.isFile ? (
              <FolderIcon className="h-12 w-12 text-blue-500" />
            ) : (
              <FileIcon className="h-12 w-12 text-gray-500" />
            )}
            <span className="text-sm font-medium text-center break-all">{item.name}</span>
            <div className="text-xs text-muted-foreground text-center">
              {item.isFile && <div>{formatFileSize(item.metadata.size)}</div>}
              <div>
                {formatDistanceToNow(new Date(item.metadata.uploadedAt), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
