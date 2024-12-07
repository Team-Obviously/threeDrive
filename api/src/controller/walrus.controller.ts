import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/utils";
import axios from "axios";
import File from "../models/file.model";
import { IWalrusNode, ICollaborator } from "../Interfaces/file.interface";
import { IBaseRequest } from "../Interfaces/utils/utils.interfaces";
import User from "../models/user.model";
import { Types, ObjectId } from "mongoose";

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
      let currentParentId: ObjectId | null = null;

      for (const folder of folders.slice(0, -1)) {
        currentPath += `/${folder}`;
        const folderData: IWalrusNode = {
          userId: user._id.toString(),
          name: folder,
          path: currentPath,
          isFile: false,
          parent: currentParentId,
          children: [],
          metadata: {
            filename: folder,
            mimetype: "folder",
            size: 0,
            uploadedAt: new Date().toISOString(),
          },
        };

        const existingFolder = await File.findOne({
          userId: user._id.toString(),
          path: currentPath,
          isFile: false,
          isDeleted: false,
        });

        if (existingFolder) {
          currentParentId = existingFolder._id;
        } else {
          const newFolder = await File.create(folderData);
          if (currentParentId) {
            await File.findByIdAndUpdate(currentParentId, {
              $push: { children: newFolder._id },
            });
          }
          currentParentId = newFolder._id;
        }
      }

      const fileData: IWalrusNode = {
        userId: user._id.toString(),
        name: uploadedFile.originalname,
        path: filepath,
        isFile: true,
        parent: currentParentId,
        children: [],
        blobId: uploadResult.data.newlyCreated.blobObject.blobId,
        walrusId: uploadResult.data.newlyCreated.blobObject.id,
        metadata: {
          filename: uploadedFile.originalname,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
          uploadedAt: new Date().toISOString(),
        },
      };

      const newFile = await File.create(fileData);
      if (currentParentId) {
        await File.findByIdAndUpdate(currentParentId, {
          $push: { children: newFile._id },
        });
      }

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
      const contents = await File.find({
        userId,
        parentFolder: path,
        isDeleted: false,
      }).sort({ isFolder: -1, "metadata.filename": 1 });

      const currentFolder =
        path === "/"
          ? null
          : await File.findOne({
              userId,
              path,
              isFolder: true,
              isDeleted: false,
            });

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

      if (file.isFile) {
        await File.updateMany(
          {
            userId,
            path: { $regex: `^${file.path}` },
            isDeleted: false,
          },
          { isDeleted: true }
        );
      } else {
        file.isDeleted = true;
        await file.save();
      }

      return res.status(200).json({
        status: "success",
        message: `${file.isFile ? "File" : "Folder"} deleted successfully`,
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
        (acc: number, file: IWalrusNode) => acc + (file.metadata?.size || 0),
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

    if (item.userId.toString() !== requestingUserId) {
      const userAccess = item.collaborators?.find(
        (c: ICollaborator) => c.userId.toString() === requestingUserId
      );
      if (!userAccess || userAccess.accessLevel !== "admin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
    }

    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      item.collaborators?.some(
        (c: ICollaborator) => c.userId.toString() === userId
      )
    ) {
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
        (c: ICollaborator) => c.userId.toString() === requestingUserId
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
      !item.collaborators?.some(
        (c: ICollaborator) => c.userId.toString() === requestingUserId
      )
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({
      message: "Collaborators retrieved successfully",
      data: item.collaborators,
    });
  });

export const getTreeStructure = () =>
  catchAsync(async (req: IBaseRequest, res: Response) => {
    const userId = req.user._id.toString();
    const { folderId = null } = req.query;

    const query = {
      userId,
      isDeleted: false,
      ...(folderId
        ? { parent: new Types.ObjectId(folderId as string) }
        : { parent: null }),
    };

    const nodes = await File.find(query)
      .populate({
        path: "children",
        match: { isDeleted: false },
        select: "name isFile metadata children",
      })
      .select("name isFile metadata children");

    return res.status(200).json({
      status: "success",
      data: nodes,
    });
  });

export const moveNode = () =>
  catchAsync(async (req: IBaseRequest, res: Response) => {
    const { id } = req.params;
    const { newParentId } = req.body;
    const userId = req.user._id.toString();

    const node = await File.findOne({ _id: id, userId, isDeleted: false });
    if (!node) {
      return res.status(404).json({ message: "Node not found" });
    }

    if (node.parent) {
      await File.findByIdAndUpdate(node.parent, {
        $pull: { children: node._id },
      });
    }

    if (newParentId) {
      const newParent = await File.findOne({
        _id: newParentId,
        userId,
        isDeleted: false,
        isFile: false,
      });
      if (!newParent) {
        return res.status(404).json({ message: "New parent folder not found" });
      }

      await File.findByIdAndUpdate(newParentId, {
        $push: { children: node._id },
      });
    }
    // Update node's parent
    node.parent = newParentId ? newParentId : null;
    await node.save();

    return res.status(200).json({
      status: "success",
      message: "Node moved successfully",
      data: node,
    });
  });

const handleFileUpload = async (
  file: Express.Multer.File,
  userId: string,
  filepath: string = "/"
) => {
  const fileBuffer = file.buffer;
  const metadata = {
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };

  // Upload to Walrus storage
  const uploadResult = await axios.put(
    `${process.env.WALRUS_PUBLISHER_URL}/v1/store?epochs=5&deletable=true`,
    fileBuffer,
    {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Metadata": JSON.stringify(metadata),
      },
    }
  );

  const fileData: IWalrusNode = {
    userId,
    name: file.originalname,
    path: filepath,
    isFile: true,
    parent: null,
    children: [],
    blobId: uploadResult.data.newlyCreated.blobObject.blobId,
    walrusId: uploadResult.data.newlyCreated.blobObject.id,
    metadata,
  };

  return File.create(fileData);
};

export const uploadFile = () =>
  catchAsync(async (req: IBaseRequest, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.files[0];
    const filepath = req.body.filepath || `/${file.originalname}`;

    const allowedTypes = {
      image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      document: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      spreadsheet: [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
    };

    const isAllowedType = Object.values(allowedTypes)
      .flat()
      .includes(file.mimetype);
    if (!isAllowedType) {
      return res.status(400).json({ message: "File type not supported" });
    }

    const uploadedFile = await handleFileUpload(
      file,
      req.user._id.toString(),
      filepath
    );

    return res.status(200).json({
      status: "success",
      data: uploadedFile,
    });
  });

export const getFile = () =>
  catchAsync(async (req: Request, res: Response) => {
    const { walrusId } = req.params;

    const file = await File.findOne({
      walrusId,
      isFile: true,
      isDeleted: false,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileStream = await axios.get(
      `${process.env.WALRUS_AGGREGATOR_URL}/v1/${file.blobId}`,
      {
        responseType: "stream",
      }
    );

    res.setHeader("Content-Type", file.metadata.mimetype);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.metadata.filename)}"`
    );

    fileStream.data.pipe(res);
  });
