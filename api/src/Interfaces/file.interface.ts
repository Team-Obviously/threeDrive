import { ObjectId } from "mongoose";

export interface IFileMetadata {
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

export interface ICollaborator {
  userId: string;
  accessLevel: "read" | "write" | "admin";
  addedAt: Date;
}

export interface IWalrusNode {
  _id?: ObjectId;
  userId: string;
  path: string;
  name: string;
  isFile: boolean;
  parent: ObjectId | null; // null for root
  children: ObjectId[];
  collaborators?: ICollaborator[];
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  // File-specific properties
  blobId?: string;
  walrusId?: string;
  metadata?: IFileMetadata;
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
