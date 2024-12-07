"use client";

import { Button } from "@/components/ui/button";
import { type Breadcrumb } from "@/types/file-system";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbNavProps {
  path: Breadcrumb[];
  onNavigate: (id: string) => void;
}

export function BreadcrumbNav({ path, onNavigate }: BreadcrumbNavProps) {
  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Button variant="ghost" size="icon" onClick={() => onNavigate("root")} className="h-8 w-8">
        <Home className="h-4 w-4" />
      </Button>
      {path.map((item, index) => (
        <div key={item.id} className="flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Button variant="ghost" className="h-8 px-2" onClick={() => onNavigate(item.id)}>
            {item.name}
          </Button>
        </div>
      ))}
    </div>
  );
}
