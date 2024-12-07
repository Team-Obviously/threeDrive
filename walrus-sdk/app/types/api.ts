export interface BlobResponse {
    newlyCreated?: {
        blobObject: {
            id: string;
            blobId: string;
            size: number;
        };
    };
    alreadyCertified?: {
        blobId: string;
        endEpoch: number;
    };
}

export type StoreBlobResponse = {
    newlyCreated?: {
        blobObject: {
            id: string;
            registeredEpoch: number;
            blobId: string;
            size: number;
            encodingType: string;
            certifiedEpoch: number;
            storage: {
                id: string;
                startEpoch: number;
                endEpoch: number;
                storageSize: number;
            };
            deletable: boolean;
        };
        resourceOperation: {
            RegisterFromScratch: {
                encoded_length: number;
                epochs_ahead: number;
            };
        };
        cost: number;
    };
}