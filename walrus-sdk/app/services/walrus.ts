import axios from "axios";
import { StoreBlobResponse } from "../types/api";

export interface WalrusConfig {
    aggregator: string;
    publisher: string;
    apiUrl: string;
}

export interface TreeNode {
    metadata: {
        filename: string;
        mimetype: string;
        size: number;
        uploadedAt: string;
    };
    _id: string;
    name: string;
    isFile: boolean;
    children: TreeNode[];
}

export class WalrusSDK {
    private aggregator: string;
    private publisher: string;
    public apiUrl: string;

    constructor(config: WalrusConfig) {
        this.aggregator = config.aggregator;
        this.publisher = config.publisher;
        this.apiUrl = config.apiUrl;
    }

    // Store a blob
    async storeBlob(data: string | Buffer, epochs: number = 1): Promise<StoreBlobResponse> {
        const url = `${this.publisher}/v1/store?epochs=${epochs}`;
        const response = await axios.put(url, data);
        return response.data;
    }

    // Get a blob by ID
    async getBlob(blobId: string) {
        try {
            const url = `${this.aggregator}/v1/${blobId}`;
            const response = await axios.get(url);
            return Buffer.from(response.data);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get blob: ${error.message}`);
            }
            throw error;
        }
    }

    // Fetch API specification
    async getApiSpecification() {
        const url = `${this.aggregator}/v1/api`;
        const response = await axios.get(url);
        return response.data;
    }

    // Create a new folder
    async createFolder(name: string, parentObjectId?: string) {
        const response = await axios.post(`${this.apiUrl}/folders`, {
            name,
            parentObjectId
        });
        return response.data;
    }

    // Get folder contents
    async getFolderContents(folderId?: string) {
        const response = await axios.get(`${this.apiUrl}/folders/contents`, {
            params: { id: folderId }
        });
        return response.data;
    }

    // Search files
    async searchFiles(query: string) {
        const response = await axios.get(`${this.apiUrl}/files/search`, {
            params: { query }
        });
        return response.data;
    }

    // Delete a node (file or folder)
    async deleteNode(id: string) {
        const response = await axios.delete(`${this.apiUrl}/nodes/${id}`);
        return response.data;
    }

    // Get all user files
    async getAllUserFiles() {
        const response = await axios.get(`${this.apiUrl}/files`);
        return response.data;
    }

    // Add collaborator
    async addCollaborator(nodeId: string, userId: string, accessLevel: string) {
        const response = await axios.post(`${this.apiUrl}/nodes/${nodeId}/collaborators`, {
            userId,
            accessLevel
        });
        return response.data;
    }

    // Remove collaborator
    async removeCollaborator(nodeId: string, userId: string) {
        const response = await axios.delete(`${this.apiUrl}/nodes/${nodeId}/collaborators/${userId}`);
        return response.data;
    }

    // Get collaborators
    async getCollaborators(nodeId: string) {
        const response = await axios.get(`${this.apiUrl}/nodes/${nodeId}/collaborators`);
        return response.data;
    }

    // Get tree structure
    async getTreeStructure(path: string = "/") {
        const response = await axios.get(`${this.apiUrl}/tree`, {
            params: { path }
        });
        return response.data;
    }

    // Move node
    async moveNode(nodeId: string, newParentId: string) {
        const response = await axios.post(`${this.apiUrl}/nodes/${nodeId}/move`, {
            newParentId
        });
        return response.data;
    }

    // Upload file
    async uploadFile(file: File, filepath: string = "/") {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filepath', filepath);

        const response = await axios.post(`${this.apiUrl}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
}
