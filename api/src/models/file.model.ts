import mongoose, { Schema, Document } from "mongoose";
import { IWalrusFile } from "../Interfaces/file.interface";

const fileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    blobId: {
      type: String,
      required: true,
    },
    walrusId: {
      type: String,
      required: true,
      unique: true,
    },
    metadata: {
      filename: {
        type: String,
        required: true,
      },
      mimetype: {
        type: String,
        required: true,
      },
      size: {
        type: Number,
        required: true,
      },
      uploadedAt: {
        type: String,
        required: true,
      },
      filepath: {
        type: String,
        required: true,
      },
    },
    parentFolder: {
      type: String,
      default: "/", // Root folder
    },
    path: {
      type: String,
      required: true,
    },
    isFolder: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster path-based queries
fileSchema.index({ path: 1, userId: 1 });
fileSchema.index({ parentFolder: 1, userId: 1 });

export default mongoose.model<IWalrusFile & Document>("File", fileSchema);
