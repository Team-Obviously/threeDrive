import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/utils";
import axios from "axios";
import File from "../models/file.model";
import { IWalrusNode, ICollaborator } from "../Interfaces/file.interface";
import { IBaseRequest } from "../Interfaces/utils/utils.interfaces";
import User from "../models/user.model";
import { Types, ObjectId } from "mongoose";
import { readFile } from "fs/promises";
import { sendEmail } from "../utils/helper";

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

async function pdfToBase64(filePath: string): Promise<string> {
  try {
    const fileBuffer = await readFile(filePath);
    const base64String = fileBuffer.toString("base64");
    return base64String;
  } catch (error) {
    throw new Error(`Error reading file: ${error.message}`);
  }
}

export const createFolder = () =>
  catchAsync(async (req: IBaseRequest, res: Response, next: NextFunction) => {
    const { name, parentObjectId } = req.body;
    console.log("parentObjectId", parentObjectId);
    if (!parentObjectId || parentObjectId === "null") {
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
      console.log("parent", parent);
      const newFolder = await File.create({
        userId: req.user._id.toString(),
        name,
        path: parent.path === "/" ? "/" + name : parent.path + "/" + name,
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
    console.log("Starting file upload...");
    const user = req.user;
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      console.log("No files found in request");
      return res.status(400).json({
        status: "error",
        message: "No file uploaded",
      });
    }

    let parentFolder = null;
    const parentFolderId = req.body.parentFolderId;
    console.log("Parent folder ID:", parentFolderId);

    if (parentFolderId !== null && parentFolderId !== "null") {
      console.log("Searching for parent folder by ID:", parentFolderId);
      parentFolder = await File.findById(parentFolderId);
      console.log("Found parent folder by ID:", parentFolder);
      if (!parentFolder) {
        return res.status(404).json({
          status: "error",
          message: "Parent folder not found",
        });
      }
    } else {
      parentFolder = await File.findOne({
        userId: user._id.toString(),
        path: "/",
        isFile: false,
      });
      console.log("Found root folder:", parentFolder);
    }

    try {
      const uploadedFile = req.files[0];
      console.log("File to upload:", {
        name: uploadedFile.originalname,
        size: uploadedFile.size,
        type: uploadedFile.mimetype,
      });

      let filepath = parentFolder
        ? `${parentFolder.path}/${uploadedFile.originalname}`
        : `/${uploadedFile.originalname}`;
      filepath = filepath.replace("//", "/");
      console.log("Generated filepath:", filepath);

      const fileBuffer = uploadedFile.buffer;
      const metadata = {
        filename: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
      };

      // Handle file content based on type
      let fileContent;
      if (uploadedFile.mimetype.startsWith("image/")) {
        // For images, convert to base64
        fileContent = `data:${
          uploadedFile.mimetype
        };base64,${fileBuffer.toString("base64")}`;
      } else {
        fileContent = fileBuffer;
      }

      // Upload to Walrus
      const uploadResult = await axios.put(
        `${process.env.WALRUS_PUBLISHER_URL}/v1/store?epochs=5&deletable=true`,
        fileContent,
        {
          headers: {
            "Content-Type": metadata.mimetype,
            "X-File-Metadata": JSON.stringify(metadata),
            ...(uploadedFile.mimetype.startsWith("image/") && {
              "Content-Transfer-Encoding": "base64",
            }),
          },
        }
      );

      // Create file record
      const fileData: IWalrusNode = {
        userId: user._id.toString(),
        name: uploadedFile.originalname,
        path: filepath,
        isFile: true,
        parent: parentFolder?._id || null,
        children: [],
        blobId: uploadResult.data.newlyCreated.blobObject.blobId,
        walrusId: uploadResult.data.newlyCreated.blobObject.id,
        metadata,
      };

      console.log("Creating file record with data:", {
        userId: user._id.toString(),
        name: uploadedFile.originalname,
        path: filepath,
        parent: parentFolder?._id || null,
      });

      const newFile = await File.create(fileData);
      console.log("Created new file:", newFile);

      // Update parent folder
      if (parentFolder) {
        console.log("Updating parent folder children:", parentFolder._id);
        await File.findByIdAndUpdate(parentFolder._id, {
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
        select: "name isFile metadata children path parent blobId walrusId",
        populate: {
          path: "children",
          match: { isDeleted: false },
          select: "name isFile metadata children path parent blobId walrusId",
          populate: {
            path: "children",
            match: { isDeleted: false },
            select: "name isFile metadata children path parent blobId walrusId",
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
        downloadUrl: node.isFile
          ? `${process.env.WALRUS_AGGREGATOR_URL}/v1/${node.blobId}`
          : null,
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
    const item = await File.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!item) {
      return res.status(404).json({ message: "File or folder not found" });
    }

    const userToAdd = await User.findOne({ email: emailId });
    const documentLink = `${process.env.REACT_APP_BASE_URL}/document/${id}`;

    await sendEmail({
      to: emailId,
      subject: `You've been added as a collaborator to ${item.name}`,
      text: `
        You have been added as a collaborator to ${
          item.isFile ? "file" : "folder"
        } "${item.name}" by ${requestingUserId}.
        
        You can access it here: ${documentLink}
        
        Best regards,
        Your ThreeDrive Team
      `,
    });
    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
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
      _id: walrusId,
      isFile: true,
      isDeleted: false,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const downloadUrl = `${process.env.WALRUS_AGGREGATOR_URL}/v1/${file.blobId}`;

    // For images, return direct URL
    if (file.metadata.mimetype.startsWith("image/")) {
      return res.status(200).json({
        status: "success",
        data: {
          metadata: file.metadata,
          name: file.name,
          mimetype: file.metadata.mimetype,
          size: file.metadata.size,
          downloadUrl,
          isImage: true,
        },
      });
    }

    // For other files, return as before
    const fileData = {
      metadata: file.metadata,
      name: file.name,
      mimetype: file.metadata.mimetype,
      size: file.metadata.size,
      downloadUrl,
      isImage: false,
    };

    return res.status(200).json({
      status: "success",
      data: fileData,
    });
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

export const updateFileContent = () =>
  catchAsync(async (req: IBaseRequest, res: Response) => {
    console.log("Starting file content update...");
    const { fileId } = req.params;
    const user = req.user;

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No file content provided",
      });
    }

    // Find existing file
    const existingFile = await File.findOne({
      _id: fileId,
      userId: user._id.toString(),
      isFile: true,
      isDeleted: false,
    });

    if (!existingFile) {
      return res.status(404).json({
        status: "error",
        message: "File not found",
      });
    }

    try {
      const newContent = req.files[0];
      const fileBuffer = newContent.buffer;

      // Keep original metadata but update size
      const metadata = {
        ...existingFile.metadata,
        size: newContent.size,
        uploadedAt: new Date().toISOString(),
      };

      // Handle file content based on type
      let fileContent;
      if (existingFile.metadata.mimetype.startsWith("image/")) {
        fileContent = `data:${
          existingFile.metadata.mimetype
        };base64,${fileBuffer.toString("base64")}`;
      } else {
        fileContent = fileBuffer;
      }

      // Upload new content to Walrus
      const uploadResult = await axios.put(
        `${process.env.WALRUS_PUBLISHER_URL}/v1/store?epochs=5&deletable=true`,
        fileContent,
        {
          headers: {
            "Content-Type": existingFile.metadata.mimetype,
            "X-File-Metadata": JSON.stringify(metadata),
            ...(existingFile.metadata.mimetype.startsWith("image/") && {
              "Content-Transfer-Encoding": "base64",
            }),
          },
        }
      );

      // Update file record with new Walrus IDs
      const updatedFile = await File.findByIdAndUpdate(
        fileId,
        {
          $set: {
            blobId: uploadResult.data.newlyCreated.blobObject.blobId,
            walrusId: uploadResult.data.newlyCreated.blobObject.id,
            metadata,
          },
        },
        { new: true }
      );

      return res.status(200).json({
        status: "success",
        message: "File content updated successfully",
        data: {
          file: updatedFile,
          walrusResponse: uploadResult.data,
        },
      });
    } catch (error) {
      console.error("Update error:", error);
      return res.status(500).json({
        status: "error",
        message: "Error updating file content",
        error: error.message,
      });
    }
  });
