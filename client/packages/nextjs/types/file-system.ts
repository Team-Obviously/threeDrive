export interface FileMetadata {
    filename: string;
    mimetype: string;
    size: number;
    uploadedAt: string;
}

export interface FileSystemItem {
    _id: string;
    name: string;
    isFile: boolean;
    children: FileSystemItem[];
    metadata: FileMetadata;
}

export interface Breadcrumb {
    id: string;
    name: string;
}

export interface FileResponse {
    status: string;
    data: FileSystemItem[];
}