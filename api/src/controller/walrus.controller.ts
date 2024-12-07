import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/utils";
import axios from "axios";
import File from "../models/file.model";
import { IWalrusNode, ICollaborator } from "../Interfaces/file.interface";
import { IBaseRequest } from "../Interfaces/utils/utils.interfaces";
import User from "../models/user.model";
import { Types, ObjectId } from "mongoose";

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

export const createFolder = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const { name, parentObjectId } = req.body;

    if (!parentObjectId) {
      const rootFolder = await File.findOne({
        userId: req.user._id.toString(),
        isFile: false,
        parent: null,
      });
      const newFolder = await File.create({
        userId: req.user._id.toString(),
        name,
        path: "/" + name,
        isFile: false,
        parent: rootFolder?._id,
        children: [],
      });
      if (rootFolder) {
        await File.findByIdAndUpdate(rootFolder._id, {
          $push: { children: newFolder._id },
        });
      }
    } else {
      const parent = await File.findById(parentObjectId);
      const newFolder = await File.create({
        userId: req.user._id.toString(),
        name,
        path: parent.path + "/" + name,
        isFile: false,
        parent: parentObjectId,
        children: [],
      });
      if (parent) {
        await File.findByIdAndUpdate(parent._id, {
          $push: { children: newFolder._id },
        });
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Folder created successfully",
    });
  });

export const addObjectToWalrus = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded",
      });
    }

    const parentFolderId = req.body.parentFolderId || null;
    try {
      const uploadedFile = req.files[0];
      const filepath = parentFolderId
        ? `${req.body.filepath}/${uploadedFile.originalname}`
        : `/${uploadedFile.originalname}`;
      const fileBuffer = uploadedFile.buffer;

      const metadata = {
        filename: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
      };

      // Upload to Walrus
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

      // Create file record
      const fileData: IWalrusNode = {
        userId: user._id.toString(),
        name: uploadedFile.originalname,
        path: filepath,
        isFile: true,
        parent: parentFolderId,
        children: [],
        blobId: uploadResult.data.newlyCreated.blobObject.blobId,
        walrusId: uploadResult.data.newlyCreated.blobObject.id,
        metadata,
      };

      const newFile = await File.create(fileData);

      // Update parent folder if exists
      if (parentFolderId) {
        await File.findByIdAndUpdate(parentFolderId, {
          $push: { children: newFile._id },
        });
      }

      // Get updated folder structure
      const updatedFolder = parentFolderId
        ? await File.findById(parentFolderId)
            .populate({
              path: "children",
              match: { isDeleted: false },
              select: "name isFile metadata children path parent",
            })
            .lean()
        : null;

      return res.status(200).json({
        status: "success",
        message: "File uploaded successfully",
        data: {
          file: newFile,
          folder: updatedFolder ? updatedFolder : null,
          walrusResponse: uploadResult.data,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({
        status: "error",
        message: "Error uploading file",
        error: error.message,
      });
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
    let { id } = req.query;

    if (!id || id === "null") {
      const rootFolder = await File.findOne({
        userId: req.user._id.toString(),
        isFile: false,
        isDeleted: false,
        parent: null,
      });
      id = rootFolder?._id.toString();
    }

    const folder = await File.findById(id)
      .populate({
        path: "children",
        match: { isDeleted: false },
        select: "name isFile metadata children path parent",
        populate: {
          path: "children",
          match: { isDeleted: false },
          select: "name isFile metadata children path parent",
          populate: {
            path: "children",
            match: { isDeleted: false },
            select: "name isFile metadata children path parent",
          },
        },
      })
      .lean();

    if (!folder) {
      return res.status(404).json({
        status: "error",
        message: "Folder not found",
      });
    }

    // Function to convert ObjectIds to strings recursively
    const convertIds = (node: any) => {
      if (!node) return node;

      const converted = {
        ...node,
        _id: node._id.toString(),
        parent: node.parent?.toString() || null,
      };

      if (Array.isArray(node.children)) {
        converted.children = node.children.map(convertIds);
      }

      return converted;
    };

    return res.status(200).json({
      status: "success",
      data: {
        folder: convertIds(folder),
      },
    });
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

export const deleteNode = () =>
  catchAsync(async (req: IBaseRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user._id.toString();

    const node = await File.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!node) {
      return res.status(404).json({
        status: "error",
        message: "File or folder not found",
      });
    }

    try {
      if (!node.isFile) {
        await markFolderAndContentsAsDeleted(node._id);

        return res.status(200).json({
          status: "success",
          message: "Folder and its contents deleted successfully",
        });
      }

      // If it's a file, just mark it as deleted
      node.isDeleted = true;
      await node.save();

      // Remove from parent's children array
      if (node.parent) {
        await File.findByIdAndUpdate(node.parent, {
          $pull: { children: node._id },
        });
      }

      return res.status(200).json({
        status: "success",
        message: "File deleted successfully",
      });
    } catch (error) {
      console.error("Delete error:", error);
      return res.status(500).json({
        status: "error",
        message: "Error deleting file/folder",
      });
    }
  });

// Helper function to recursively mark folder and its contents as deleted
const markFolderAndContentsAsDeleted = async (folderId: ObjectId) => {
  const folder = await File.findById(folderId);
  if (!folder) return;

  // Mark the folder as deleted
  folder.isDeleted = true;
  await folder.save();

  // Remove from parent's children array
  if (folder.parent) {
    await File.findByIdAndUpdate(folder.parent, {
      $pull: { children: folder._id },
    });
  }

  // Recursively mark all children as deleted
  for (const childId of folder.children) {
    const child = await File.findById(childId);
    if (child) {
      if (child.isFile) {
        child.isDeleted = true;
        await child.save();
      } else {
        await markFolderAndContentsAsDeleted(child._id);
      }
    }
  }
};

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
    const { emailId } = req.body;
    const requestingUserId = req.user?._id.toString();

    const userToAdd = await User.findOne({ email: emailId });
    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    const item = await File.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!item) {
      return res.status(404).json({ message: "File or folder not found" });
    }

    // Check if user is owner
    if (item.userId.toString() !== requestingUserId) {
      return res
        .status(403)
        .json({ message: "Only owner can add collaborators" });
    }

    // Check if user is already a collaborator
    if (
      item.collaborators?.some(
        (c: ICollaborator) => c.userId.toString() === userToAdd._id.toString()
      )
    ) {
      return res
        .status(400)
        .json({ message: "User is already a collaborator" });
    }

    const collaborator: ICollaborator = {
      userId: userToAdd._id.toString(),
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
      if (!userAccess) {
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
    const { path = "/" } = req.query;

    try {
      // Get all items in current path
      const [folders, files] = await Promise.all([
        // Get folders in current path
        File.find({
          userId,
          isDeleted: false,
          isFile: false,
          path: path as string,
        }).lean(),
        // Get files in current path
        File.find({
          userId,
          isDeleted: false,
          isFile: true,
          path: path as string,
        }).lean(),
      ]);

      const formattedNodes = [
        ...folders.map((node) => ({
          metadata: node.metadata,
          _id: node._id.toString(),
          name: node.name,
          isFile: false,
          children: [] as TreeNode[],
        })),
        ...files.map((node) => ({
          metadata: node.metadata,
          _id: node._id.toString(),
          name: node.name,
          isFile: true,
          children: [] as TreeNode[],
        })),
      ];

      if (formattedNodes.length === 0) {
        return res.status(200).json({
          status: "success",
          data: {
            currentPath: path,
            folders: [],
            files: [],
            tree: [
              {
                metadata: {
                  filename: "Root",
                  mimetype: "folder",
                  size: 0,
                  uploadedAt: new Date().toISOString(),
                },
                _id: "root",
                name: "Root",
                isFile: false,
                children: [] as TreeNode[],
              },
            ],
          },
        });
      }

      return res.status(200).json({
        status: "success",
        data: {
          currentPath: path,
          folders: folders.map((f) => ({
            ...f,
            _id: f._id.toString(),
          })),
          files: files.map((f) => ({
            ...f,
            _id: f._id.toString(),
          })),
          tree: formattedNodes,
        },
      });
    } catch (error) {
      console.error("Error getting tree structure:", error);
      return res.status(200).json({
        status: "success",
        data: {
          currentPath: "/",
          folders: [],
          files: [],
          tree: [
            {
              metadata: {
                filename: "Root",
                mimetype: "folder",
                size: 0,
                uploadedAt: new Date().toISOString(),
              },
              _id: "root",
              name: "Root",
              isFile: false,
              children: [] as TreeNode[],
            },
          ],
        },
      });
    }
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
  // Check if same file exists (by name and size)
  const existingFile = await File.findOne({
    userId,
    "metadata.filename": file.originalname,
    "metadata.size": file.size,
    isFile: true,
    isDeleted: false,
  });

  if (existingFile) {
    // Create new file record with existing Walrus data
    const newFileData: IWalrusNode = {
      userId,
      name: file.originalname,
      path: filepath,
      isFile: true,
      parent: null,
      children: [],
      blobId: existingFile.blobId, // Reuse existing blobId
      walrusId: existingFile.walrusId, // Reuse existing walrusId
      metadata: {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    };

    return File.create(newFileData);
  }

  // If no existing file, proceed with normal upload
  const fileBuffer = file.buffer;
  const metadata = {
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };

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

    // res.setHeader("Content-Type", file.metadata.mimetype);
    // res.setHeader(
    //   "Content-Disposition",
    //   `inline; filename="${encodeURIComponent(file.metadata.filename)}"`
    // );

    fileStream.data.pipe(res);
  });

export const initializeUserFileStructure = async (userId: string) => {
  try {
    const rootFolder: IWalrusNode = {
      userId,
      name: "Root",
      path: "/",
      isFile: false,
      parent: null,
      children: [],
      metadata: {
        filename: "Root",
        mimetype: "folder",
        size: 0,
        uploadedAt: new Date().toISOString(),
      },
    };

    const existingRoot = await File.findOne({
      userId,
      path: "/",
      isFile: false,
    });

    if (!existingRoot) {
      await File.create(rootFolder);
    }
  } catch (error) {
    console.error("Error initializing file structure:", error);
    throw error;
  }
};
