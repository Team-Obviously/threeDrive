export interface IFileMetadata {
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  filepath: string;
}

export interface IWalrusStorage {
  id: string;
  startEpoch: number;
  endEpoch: number;
  storageSize: number;
}

export interface IWalrusBlobObject {
  id: string;
  registeredEpoch: number;
  blobId: string;
  size: number;
  encodingType: string;
  certifiedEpoch: number;
  storage: IWalrusStorage;
  deletable: boolean;
}

export interface IWalrusResponse {
  newlyCreated: {
    blobObject: IWalrusBlobObject;
    resourceOperation: {
      RegisterFromScratch: {
        encoded_length: number;
        epochs_ahead: number;
      };
    };
    cost: number;
  };
}

export interface ICollaborator {
  userId: string;
  accessLevel: "read" | "write" | "admin";
  addedAt: Date;
}

export interface IWalrusFile {
  _id?: string;
  userId: string;
  blobId: string;
  walrusId: string;
  metadata: IFileMetadata;
  parentFolder: string;
  path: string;
  isFolder?: boolean;
  isDeleted?: boolean;
  collaborators?: ICollaborator[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFileUploadResponse {
  status: string;
  message: string;
  data: {
    walrusId: string;
    url: string;
    filename: string;
    mimetype: string;
    size: number;
    uploadedAt: string;
  };
}

export interface IFolder {
  _id?: string;
  userId: string;
  name: string;
  path: string;
  parentFolder: string;
  isFolder: true;
  collaborators?: ICollaborator[];
  createdAt?: Date;
  updatedAt?: Date;
}
