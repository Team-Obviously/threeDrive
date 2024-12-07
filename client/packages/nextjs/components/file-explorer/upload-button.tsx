"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface UploadButtonProps {
  currentFolderId: string;
  onFileUpload: (file: File) => void;
}

export function UploadButton({ currentFolderId, onFileUpload }: UploadButtonProps) {
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      toast({
        title: "File uploaded",
        description: `Successfully uploaded ${file.name}`,
      });
    }
  };

  return (
    <div className="relative">
      <Input type="file" className="hidden" id="file-upload" onChange={handleFileChange} />
      <label htmlFor="file-upload">
        <Button asChild>
          <span>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </span>
        </Button>
      </label>
    </div>
  );
}
