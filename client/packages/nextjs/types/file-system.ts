export interface FileItem {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: number;
    createdAt: Date;
    modifiedAt: Date;
    parentId: string | null;
}

export interface Breadcrumb {
    id: string;
    name: string;
}