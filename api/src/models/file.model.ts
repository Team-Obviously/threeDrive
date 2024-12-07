import { Schema, model } from "mongoose";
import { IWalrusNode } from "../Interfaces/file.interface";

const collaboratorSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  accessLevel: {
    type: String,
    enum: ["read", "write", "admin"],
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const fileSchema = new Schema<IWalrusNode>(
  {
    userId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    isFile: {
      type: Boolean,
      required: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    children: [
      {
        type: Schema.Types.ObjectId,
        ref: "File",
      },
    ],
    collaborators: [collaboratorSchema],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // Only required for files, not folders
    blobId: {
      type: String,
      required: function (this: IWalrusNode) {
        return this.isFile;
      },
      sparse: true, // Allow null for folders
    },
    walrusId: {
      type: String,
      required: function (this: IWalrusNode) {
        return this.isFile;
      },
      sparse: true, // Allow null for folders
    },
    metadata: {
      filename: String,
      mimetype: String,
      size: Number,
      uploadedAt: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
fileSchema.index({ userId: 1, path: 1 });
fileSchema.index({ parent: 1 });
fileSchema.index({ isDeleted: 1 });
fileSchema.index({ walrusId: 1 }, { sparse: true }); // Make sparse index
fileSchema.index({ "collaborators.userId": 1 });

export default model<IWalrusNode>("File", fileSchema);
