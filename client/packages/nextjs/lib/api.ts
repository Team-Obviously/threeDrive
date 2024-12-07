import { Breadcrumb, FileSystemItem } from "~~/types/file-system";
import { getRequest } from "~~/utils/generalService";

export async function fetchFiles(): Promise<FileSystemItem[]> {
    try {
        const response = await getRequest("/walrus/folder");
        return response.data.data.folder;
    } catch (error) {
        console.error('Error fetching files:', error);
        return [];
    }
}

export function findItemById(items: FileSystemItem[], id: string): FileSystemItem | null {
    for (const item of items) {
        if (item._id === id) return item;
        if (item.children.length > 0) {
            const found = findItemById(item.children, id);
            if (found) return found;
        }
    }
    return null;
}

export function buildBreadcrumbs(
    items: FileSystemItem[],
    currentId: string
): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];
    const findPath = (currentItems: FileSystemItem[], id: string): boolean => {
        for (const item of currentItems) {
            if (item._id === id) {
                breadcrumbs.push({ id: item._id, name: item.name });
                return true;
            }
            if (item.children.length > 0 && findPath(item.children, id)) {
                breadcrumbs.unshift({ id: item._id, name: item.name });
                return true;
            }
        }
        return false;
    };
    findPath(items, currentId);
    return breadcrumbs;
}