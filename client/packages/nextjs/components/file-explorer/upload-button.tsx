import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderPlus, Plus, Upload } from "lucide-react";
import { useToast } from "~~/hooks/use-toast";
import { postRequest } from "~~/utils/generalService";

interface UploadButtonProps {
  currentPath?: string;
  onUploadComplete?: () => void;
}

export function UploadButton({ currentPath = "/", onUploadComplete }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    console.log("file", file);
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("filepath", `${currentPath}`);
    console.log("FormData entries:");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    console.log("formData", formData);

    try {
      const response = await postRequest("/walrus/upload", {
        body: formData,
      });

      if (response.status !== 200) {
        throw new Error("Upload failed");
      }

      toast({
        title: "Success",
        description: "File uploaded successfully",
        variant: "default",
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Trigger refresh of file list
      onUploadComplete?.();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" className="flex items-center gap-2" disabled={isUploading}>
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Uploading...</span>
              </div>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                New
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4" />
            <span>Upload File</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4" />
            <span>Create Folder</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
