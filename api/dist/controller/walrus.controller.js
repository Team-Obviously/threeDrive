"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeUserFileStructure = exports.getFile = exports.uploadFile = exports.moveNode = exports.getTreeStructure = exports.getCollaborators = exports.removeCollaborator = exports.addCollaborator = exports.getAllUserFiles = exports.deleteNode = exports.searchFiles = exports.getFolderContents = exports.getObjectFromWalrus = exports.addObjectToWalrus = void 0;
const utils_1 = require("../utils/utils");
const axios_1 = __importDefault(require("axios"));
const file_model_1 = __importDefault(require("../models/file.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const mongoose_1 = require("mongoose");
const addObjectToWalrus = () => (0, utils_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const uploadResult = yield axios_1.default.put(`${process.env.WALRUS_PUBLISHER_URL}/v1/store?epochs=5&deletable=true`, fileBuffer, {
            headers: {
                "Content-Type": "application/octet-stream",
                "X-File-Metadata": metadataString,
            },
        });
        const folders = filepath.split("/").filter(Boolean);
        let currentPath = "";
        let currentParentId = null;
        for (const folder of folders.slice(0, -1)) {
            currentPath += `/${folder}`;
            const folderData = {
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
            const existingFolder = yield file_model_1.default.findOne({
                userId: user._id.toString(),
                path: currentPath,
                isFile: false,
                isDeleted: false,
            });
            if (existingFolder) {
                currentParentId = existingFolder._id;
            }
            else {
                const newFolder = yield file_model_1.default.create(folderData);
                if (currentParentId) {
                    yield file_model_1.default.findByIdAndUpdate(currentParentId, {
                        $push: { children: newFolder._id },
                    });
                }
                currentParentId = newFolder._id;
            }
        }
        const fileData = {
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
        const newFile = yield file_model_1.default.create(fileData);
        if (currentParentId) {
            yield file_model_1.default.findByIdAndUpdate(currentParentId, {
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
    }
    catch (error) {
        console.error("Upload error:", error);
        return next(error);
    }
}));
exports.addObjectToWalrus = addObjectToWalrus;
const getObjectFromWalrus = () => (0, utils_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { walrusId } = req.params;
    try {
        const file = yield file_model_1.default.findOne({
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
        const fileResponse = yield axios_1.default.get(`${process.env.WALRUS_AGGREGATOR_URL}/v1/${file.blobId}`, {
            responseType: "stream",
            headers: {
                Accept: "*/*",
            },
        });
        // Set response headers for file download
        res.setHeader("Content-Type", file.metadata.mimetype);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.metadata.filename)}"`);
        res.setHeader("Content-Length", file.metadata.size);
        fileResponse.data.pipe(res);
    }
    catch (error) {
        console.error("Retrieval error:", error);
        return next(error);
    }
}));
exports.getObjectFromWalrus = getObjectFromWalrus;
const getFolderContents = () => (0, utils_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { path = "/" } = req.query;
    const userId = req.user._id.toString();
    try {
        const contents = yield file_model_1.default.find({
            userId,
            parentFolder: path,
            isDeleted: false,
        }).sort({ isFolder: -1, "metadata.filename": 1 });
        const currentFolder = path === "/"
            ? null
            : yield file_model_1.default.findOne({
                userId,
                path,
                isFolder: true,
                isDeleted: false,
            });
        const breadcrumb = path === "/"
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
    }
    catch (error) {
        return next(error);
    }
}));
exports.getFolderContents = getFolderContents;
const searchFiles = () => (0, utils_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { query = "" } = req.query;
    const userId = req.user._id.toString();
    try {
        const files = yield file_model_1.default.find({
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
    }
    catch (error) {
        return next(error);
    }
}));
exports.searchFiles = searchFiles;
const deleteNode = () => (0, utils_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.user._id.toString();
    const node = yield file_model_1.default.findOne({
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
            yield markFolderAndContentsAsDeleted(node._id);
            return res.status(200).json({
                status: "success",
                message: "Folder and its contents deleted successfully",
            });
        }
        // If it's a file, just mark it as deleted
        node.isDeleted = true;
        yield node.save();
        // Remove from parent's children array
        if (node.parent) {
            yield file_model_1.default.findByIdAndUpdate(node.parent, {
                $pull: { children: node._id },
            });
        }
        return res.status(200).json({
            status: "success",
            message: "File deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete error:", error);
        return res.status(500).json({
            status: "error",
            message: "Error deleting file/folder",
        });
    }
}));
exports.deleteNode = deleteNode;
// Helper function to recursively mark folder and its contents as deleted
const markFolderAndContentsAsDeleted = (folderId) => __awaiter(void 0, void 0, void 0, function* () {
    const folder = yield file_model_1.default.findById(folderId);
    if (!folder)
        return;
    // Mark the folder as deleted
    folder.isDeleted = true;
    yield folder.save();
    // Remove from parent's children array
    if (folder.parent) {
        yield file_model_1.default.findByIdAndUpdate(folder.parent, {
            $pull: { children: folder._id },
        });
    }
    // Recursively mark all children as deleted
    for (const childId of folder.children) {
        const child = yield file_model_1.default.findById(childId);
        if (child) {
            if (child.isFile) {
                child.isDeleted = true;
                yield child.save();
            }
            else {
                yield markFolderAndContentsAsDeleted(child._id);
            }
        }
    }
});
const getAllUserFiles = () => (0, utils_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user._id.toString();
    try {
        const files = yield file_model_1.default.find({
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
        const totalSize = files.reduce((acc, file) => { var _a; return acc + (((_a = file.metadata) === null || _a === void 0 ? void 0 : _a.size) || 0); }, 0);
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
    }
    catch (error) {
        return next(error);
    }
}));
exports.getAllUserFiles = getAllUserFiles;
const addCollaborator = () => (0, utils_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { id } = req.params;
    const { userId, accessLevel } = req.body;
    const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id.toString();
    const item = yield file_model_1.default.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!item) {
        return res.status(404).json({ message: "File or folder not found" });
    }
    if (item.userId.toString() !== requestingUserId) {
        const userAccess = (_b = item.collaborators) === null || _b === void 0 ? void 0 : _b.find((c) => c.userId.toString() === requestingUserId);
        if (!userAccess || userAccess.accessLevel !== "admin") {
            return res.status(403).json({ message: "Insufficient permissions" });
        }
    }
    const userToAdd = yield user_model_1.default.findById(userId);
    if (!userToAdd) {
        return res.status(404).json({ message: "User not found" });
    }
    if ((_c = item.collaborators) === null || _c === void 0 ? void 0 : _c.some((c) => c.userId.toString() === userId)) {
        return res
            .status(400)
            .json({ message: "User is already a collaborator" });
    }
    const collaborator = {
        userId,
        accessLevel,
        addedAt: new Date(),
    };
    const updatedItem = yield file_model_1.default.findByIdAndUpdate(id, { $push: { collaborators: collaborator } }, { new: true });
    return res.status(200).json({
        message: "Collaborator added successfully",
        data: updatedItem,
    });
}));
exports.addCollaborator = addCollaborator;
const removeCollaborator = () => (0, utils_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id, userId } = req.params;
    const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id.toString();
    const item = yield file_model_1.default.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!item) {
        return res.status(404).json({ message: "File or folder not found" });
    }
    if (item.userId.toString() !== requestingUserId) {
        const userAccess = (_b = item.collaborators) === null || _b === void 0 ? void 0 : _b.find((c) => c.userId.toString() === requestingUserId);
        if (!userAccess || userAccess.accessLevel !== "admin") {
            return res.status(403).json({ message: "Insufficient permissions" });
        }
    }
    const updatedItem = yield file_model_1.default.findByIdAndUpdate(id, { $pull: { collaborators: { userId } } }, { new: true });
    return res.status(200).json({
        message: "Collaborator removed successfully",
        data: updatedItem,
    });
}));
exports.removeCollaborator = removeCollaborator;
const getCollaborators = () => (0, utils_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id.toString();
    const item = yield file_model_1.default.findOne({
        _id: id,
        isDeleted: { $ne: true },
    }).populate("collaborators.userId", "name email");
    if (!item) {
        return res.status(404).json({ message: "File or folder not found" });
    }
    if (item.userId.toString() !== requestingUserId &&
        !((_b = item.collaborators) === null || _b === void 0 ? void 0 : _b.some((c) => c.userId.toString() === requestingUserId))) {
        return res.status(403).json({ message: "Access denied" });
    }
    return res.status(200).json({
        message: "Collaborators retrieved successfully",
        data: item.collaborators,
    });
}));
exports.getCollaborators = getCollaborators;
const getTreeStructure = () => (0, utils_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user._id.toString();
    const { folderId = null } = req.query;
    const query = Object.assign({ userId, isDeleted: false }, (folderId
        ? { parent: new mongoose_1.Types.ObjectId(folderId) }
        : { parent: null }));
    const nodes = yield file_model_1.default.find(query)
        .populate({
        path: "children",
        match: { isDeleted: false },
        select: "name isFile metadata children",
    })
        .select("name isFile metadata children");
    // If no nodes found, check if root exists, if not create it
    if (nodes.length === 0) {
        const rootFolder = yield file_model_1.default.findOne({
            userId,
            path: "/",
            isFile: false,
            isDeleted: false,
        });
        if (!rootFolder) {
            // Initialize root folder
            const newRoot = {
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
            const createdRoot = yield file_model_1.default.create(newRoot);
            return res.status(200).json({
                status: "success",
                data: [createdRoot],
            });
        }
        // Return root folder if it exists but is empty
        return res.status(200).json({
            status: "success",
            data: [rootFolder],
        });
    }
    return res.status(200).json({
        status: "success",
        data: nodes,
    });
}));
exports.getTreeStructure = getTreeStructure;
const moveNode = () => (0, utils_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { newParentId } = req.body;
    const userId = req.user._id.toString();
    const node = yield file_model_1.default.findOne({ _id: id, userId, isDeleted: false });
    if (!node) {
        return res.status(404).json({ message: "Node not found" });
    }
    if (node.parent) {
        yield file_model_1.default.findByIdAndUpdate(node.parent, {
            $pull: { children: node._id },
        });
    }
    if (newParentId) {
        const newParent = yield file_model_1.default.findOne({
            _id: newParentId,
            userId,
            isDeleted: false,
            isFile: false,
        });
        if (!newParent) {
            return res.status(404).json({ message: "New parent folder not found" });
        }
        yield file_model_1.default.findByIdAndUpdate(newParentId, {
            $push: { children: node._id },
        });
    }
    // Update node's parent
    node.parent = newParentId ? newParentId : null;
    yield node.save();
    return res.status(200).json({
        status: "success",
        message: "Node moved successfully",
        data: node,
    });
}));
exports.moveNode = moveNode;
const handleFileUpload = (file_1, userId_1, ...args_1) => __awaiter(void 0, [file_1, userId_1, ...args_1], void 0, function* (file, userId, filepath = "/") {
    const fileBuffer = file.buffer;
    const metadata = {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
    };
    // Upload to Walrus storage
    const uploadResult = yield axios_1.default.put(`${process.env.WALRUS_PUBLISHER_URL}/v1/store?epochs=5&deletable=true`, fileBuffer, {
        headers: {
            "Content-Type": "application/octet-stream",
            "X-File-Metadata": JSON.stringify(metadata),
        },
    });
    const fileData = {
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
    return file_model_1.default.create(fileData);
});
const uploadFile = () => (0, utils_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    const uploadedFile = yield handleFileUpload(file, req.user._id.toString(), filepath);
    return res.status(200).json({
        status: "success",
        data: uploadedFile,
    });
}));
exports.uploadFile = uploadFile;
const getFile = () => (0, utils_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walrusId } = req.params;
    const file = yield file_model_1.default.findOne({
        walrusId,
        isFile: true,
        isDeleted: false,
    });
    if (!file) {
        return res.status(404).json({ message: "File not found" });
    }
    const fileStream = yield axios_1.default.get(`${process.env.WALRUS_AGGREGATOR_URL}/v1/${file.blobId}`, {
        responseType: "stream",
    });
    res.setHeader("Content-Type", file.metadata.mimetype);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.metadata.filename)}"`);
    fileStream.data.pipe(res);
}));
exports.getFile = getFile;
const initializeUserFileStructure = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rootFolder = {
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
        const existingRoot = yield file_model_1.default.findOne({
            userId,
            path: "/",
            isFile: false,
        });
        if (!existingRoot) {
            yield file_model_1.default.create(rootFolder);
        }
    }
    catch (error) {
        console.error("Error initializing file structure:", error);
        throw error;
    }
});
exports.initializeUserFileStructure = initializeUserFileStructure;
//# sourceMappingURL=walrus.controller.js.map