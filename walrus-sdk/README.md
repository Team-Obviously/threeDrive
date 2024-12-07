# Walrus SDK

A TypeScript-safe SDK for interacting with Walrus APIs, providing seamless file storage and management capabilities.

## Installation

```bash
npm install @hibernuts/walrus-sdk
```

## Initialization

```typescript
import { WalrusSDK } from "@hibernuts/walrus-sdk";

const walrus = new WalrusSDK({
  aggregator: "YOUR_AGGREGATOR_URL",
  publisher: "YOUR_PUBLISHER_URL",
  apiUrl: "YOUR_API_URL",
});
```

## Core Functions

### File Storage

#### `storeBlob(data: string | Buffer, epochs: number = 1)`

Store raw data in the Walrus network.

- **Parameters:**
  - `data`: The data to store (string or Buffer)
  - `epochs`: Number of epochs to store the data (default: 1)
- **Returns:** StoreBlobResponse with blob details

#### `getBlob(blobId: string)`

Retrieve raw data from the Walrus network.

- **Parameters:**
  - `blobId`: The ID of the blob to retrieve
- **Returns:** Buffer containing the blob data

### File Management

#### `uploadFile(file: File, filepath: string = "/")`

Upload a file to the system.

- **Parameters:**
  - `file`: File object to upload
  - `filepath`: Target path for the file (default: "/")
- **Returns:** Upload response with file details

#### `createFolder(name: string, parentObjectId?: string)`

Create a new folder in the system.

- **Parameters:**
  - `name`: Name of the folder
  - `parentObjectId`: ID of the parent folder (optional)
- **Returns:** Creation status

#### `getFolderContents(folderId?: string)`

Get contents of a folder.

- **Parameters:**
  - `folderId`: ID of the folder (optional, root folder if not specified)
- **Returns:** Array of files and folders in the specified folder

#### `getTreeStructure(path: string = "/")`

Get hierarchical structure of files and folders.

- **Parameters:**
  - `path`: Starting path (default: "/")
- **Returns:** Tree structure of files and folders

#### `moveNode(nodeId: string, newParentId: string)`

Move a file or folder to a new location.

- **Parameters:**
  - `nodeId`: ID of the node to move
  - `newParentId`: ID of the new parent folder
- **Returns:** Move operation status

#### `deleteNode(id: string)`

Delete a file or folder.

- **Parameters:**
  - `id`: ID of the node to delete
- **Returns:** Deletion status

### Search and Retrieval

#### `searchFiles(query: string)`

Search for files and folders.

- **Parameters:**
  - `query`: Search query string
- **Returns:** Array of matching files and folders

#### `getAllUserFiles()`

Get all files owned by the user.

- **Returns:** Array of user's files with metadata and statistics

### Collaboration

#### `addCollaborator(nodeId: string, userId: string, accessLevel: string)`

Add a collaborator to a file or folder.

- **Parameters:**
  - `nodeId`: ID of the target node
  - `userId`: ID of the user to add
  - `accessLevel`: Permission level for the collaborator
- **Returns:** Updated node information

#### `removeCollaborator(nodeId: string, userId: string)`

Remove a collaborator from a file or folder.

- **Parameters:**
  - `nodeId`: ID of the target node
  - `userId`: ID of the user to remove
- **Returns:** Updated node information

#### `getCollaborators(nodeId: string)`

Get list of collaborators for a file or folder.

- **Parameters:**
  - `nodeId`: ID of the target node
- **Returns:** Array of collaborators with their access levels

### System Information

#### `getApiSpecification()`

Fetch the API specification.

- **Returns:** API specification details

## Types

### TreeNode

```typescript
interface TreeNode {
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
```

## Error Handling

All methods can throw errors for invalid operations or network issues. It's recommended to implement try-catch blocks:

```typescript
try {
  const result = await walrus.uploadFile(file);
} catch (error) {
  console.error("Upload failed:", error.message);
}
```

## Examples

### Basic File Upload

```typescript
const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
const result = await walrus.uploadFile(file, "/documents/hello.txt");
```

### Creating and Managing Folders

```typescript
// Create a folder
await walrus.createFolder("Documents");

// Get folder contents
const contents = await walrus.getFolderContents("folderId");
```

### Collaboration

```typescript
// Add a collaborator with read access
await walrus.addCollaborator("fileId", "userId", "read");

// Get collaborators
const collaborators = await walrus.getCollaborators("fileId");
```
