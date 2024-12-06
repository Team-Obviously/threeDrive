import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/utils";
import axios from "axios";
import File from "../models/file.model";
import { IWalrusFile, ICollaborator } from "../Interfaces/file.interface";
import { IBaseRequest } from "../Interfaces/utils/utils.interfaces";
import User from "../models/user.model";
import { Types } from "mongoose";

export const addObjectToWalrus = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded",
      });
    }

    try {
      const uploadedFile = req.files[0];
      const filepath = req.body.filepath || "/";
      const fileBuffer = uploadedFile.buffer;

      const metadata = {
        filename: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
        filepath,
      };

      const metadataString = JSON.stringify(metadata);

      const uploadResult = await axios.put(
        `${process.env.WALRUS_PUBLISHER_URL}/v1/store?epochs=5&deletable=true`,
        fileBuffer,
        {
          headers: {
            "Content-Type": "application/octet-stream",
            "X-File-Metadata": metadataString,
          },
        }
      );

      const folders = filepath.split("/").filter(Boolean);
      let currentPath = "";

      for (const folder of folders.slice(0, -1)) {
        currentPath += `/${folder}`;
        await File.findOneAndUpdate(
          {
            userId: user._id.toString(),
            path: currentPath,
            isFolder: true,
          },
          {
            userId: user._id.toString(),
            metadata: { filename: folder },
            path: currentPath,
            parentFolder: currentPath.split("/").slice(0, -1).join("/") || "/",
            isFolder: true,
          },
          { upsert: true }
        );
      }

      const fileData: IWalrusFile = {
        userId: user._id.toString(),
        blobId: uploadResult.data.newlyCreated.blobObject.blobId,
        walrusId: uploadResult.data.newlyCreated.blobObject.id,
        metadata,
        path: filepath,
        parentFolder:
          folders.length > 1 ? `/${folders.slice(0, -1).join("/")}` : "/",
      };

      const newFile = await File.create(fileData);

      return res.status(200).json({
        status: "success",
        message: "File uploaded successfully",
        data: {
          file: newFile,
          walrusResponse: uploadResult.data,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      return next(error);
    }
  });

export const getObjectFromWalrus = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const { walrusId } = req.params;

    try {
      const file = await File.findOne({
        walrusId,
        userId: req.user._id.toString(),
        isDeleted: false,
        isFolder: false,
      });

      if (!file) {
        return res.status(404).json({
          status: "error",
          message: "File not found",
        });
      }

      // Get file from Walrus using aggregator URL for direct file download
      const fileResponse = await axios.get(
        `${process.env.WALRUS_AGGREGATOR_URL}/v1/${file.blobId}`,
        {
          responseType: "stream",
          headers: {
            Accept: "*/*",
          },
        }
      );

      // Set response headers for file download
      res.setHeader("Content-Type", file.metadata.mimetype);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(file.metadata.filename)}"`
      );
      res.setHeader("Content-Length", file.metadata.size);

      // Stream the file to the client
      fileResponse.data.pipe(res);
    } catch (error) {
      console.error("Retrieval error:", error);
      return next(error);
    }
  });

export const getFolderContents = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const { path = "/" } = req.query;
    const userId = req.user._id.toString();

    try {
      // Get all files and folders in the current directory (not recursive)
      const contents = await File.find({
        userId,
        parentFolder: path,
        isDeleted: false,
      }).sort({ isFolder: -1, "metadata.filename": 1 }); // Folders first, then files

      // Get folder details
      const currentFolder =
        path === "/"
          ? null
          : await File.findOne({
              userId,
              path,
              isFolder: true,
              isDeleted: false,
            });

      // Calculate breadcrumb
      const breadcrumb =
        path === "/"
          ? [{ name: "Root", path: "/" }]
          : [
              { name: "Root", path: "/" },
              ...String(path)
                .split("/")
                .filter(Boolean)
                .map((folder, index, arr) => ({
                  name: folder,
                  path: "/" + arr.slice(0, index + 1).join("/"),
                })),
            ];

      return res.status(200).json({
        status: "success",
        data: {
          currentFolder,
          contents,
          breadcrumb,
          currentPath: path,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

export const searchFiles = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const { query = "" } = req.query;
    const userId = req.user._id.toString();

    try {
      const files = await File.find({
        userId,
        isDeleted: false,
        $or: [
          { "metadata.filename": { $regex: query, $options: "i" } },
          { path: { $regex: query, $options: "i" } },
        ],
      }).sort({ isFolder: -1, "metadata.filename": 1 });

      return res.status(200).json({
        status: "success",
        data: {
          files,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

export const deleteFile = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const { walrusId } = req.params;
    const userId = req.user._id.toString();

    try {
      const file = await File.findOne({
        walrusId,
        userId,
        isDeleted: false,
      });

      if (!file) {
        return res.status(404).json({
          status: "error",
          message: "File not found",
        });
      }

      if (file.isFolder) {
        // If it's a folder, mark all files and subfolders as deleted
        await File.updateMany(
          {
            userId,
            path: { $regex: `^${file.path}` },
            isDeleted: false,
          },
          { isDeleted: true }
        );
      } else {
        // If it's a file, just mark it as deleted
        file.isDeleted = true;
        await file.save();
      }

      return res.status(200).json({
        status: "success",
        message: `${file.isFolder ? "Folder" : "File"} deleted successfully`,
      });
    } catch (error) {
      return next(error);
    }
  });

export const getAllUserFiles = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const userId = req.user._id.toString();

    try {
      const files = await File.find({
        userId,
        isDeleted: false,
        isFolder: false,
      })
        .sort({ "metadata.filename": 1 })
        .select({
          "metadata.filename": 1,
          "metadata.size": 1,
          "metadata.mimetype": 1,
          "metadata.uploadedAt": 1,
          path: 1,
          walrusId: 1,
          blobId: 1,
        });

      const totalSize = files.reduce(
        (acc, file) => acc + (file.metadata.size || 0),
        0
      );

      const fileCount = files.length;

      return res.status(200).json({
        status: "success",
        data: {
          files,
          stats: {
            totalFiles: fileCount,
            totalSize,
            averageSize: fileCount > 0 ? totalSize / fileCount : 0,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  });

export const addCollaborator = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, accessLevel } = req.body;
    const requestingUserId = req.user?._id.toString();

    const item = await File.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!item) {
      return res.status(404).json({ message: "File or folder not found" });
    }

    // Check if requesting user has permission to add collaborators
    if (item.userId.toString() !== requestingUserId) {
      const userAccess = item.collaborators?.find(
        (c) => c.userId.toString() === requestingUserId
      );
      if (!userAccess || userAccess.accessLevel !== "admin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
    }

    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    if (item.collaborators?.some((c) => c.userId.toString() === userId)) {
      return res
        .status(400)
        .json({ message: "User is already a collaborator" });
    }

    const collaborator: ICollaborator = {
      userId,
      accessLevel,
      addedAt: new Date(),
    };

    const updatedItem = await File.findByIdAndUpdate(
      id,
      { $push: { collaborators: collaborator } },
      { new: true }
    );

    return res.status(200).json({
      message: "Collaborator added successfully",
      data: updatedItem,
    });
  });

export const removeCollaborator = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const { id, userId } = req.params;
    const requestingUserId = req.user?._id.toString();

    const item = await File.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!item) {
      return res.status(404).json({ message: "File or folder not found" });
    }

    if (item.userId.toString() !== requestingUserId) {
      const userAccess = item.collaborators?.find(
        (c) => c.userId.toString() === requestingUserId
      );
      if (!userAccess || userAccess.accessLevel !== "admin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
    }

    const updatedItem = await File.findByIdAndUpdate(
      id,
      { $pull: { collaborators: { userId } } },
      { new: true }
    );

    return res.status(200).json({
      message: "Collaborator removed successfully",
      data: updatedItem,
    });
  });

export const getCollaborators = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const requestingUserId = req.user?._id.toString();

    const item = await File.findOne({
      _id: id,
      isDeleted: { $ne: true },
    }).populate("collaborators.userId", "name email");

    if (!item) {
      return res.status(404).json({ message: "File or folder not found" });
    }

    if (
      item.userId.toString() !== requestingUserId &&
      !item.collaborators?.some((c) => c.userId.toString() === requestingUserId)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({
      message: "Collaborators retrieved successfully",
      data: item.collaborators,
    });
  });
