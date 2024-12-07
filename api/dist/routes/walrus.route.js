"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const walrus_controller_1 = require("../controller/walrus.controller");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
});
router.post("/", upload.any(), (0, walrus_controller_1.addObjectToWalrus)());
router.get("/file/:walrusId", (0, walrus_controller_1.getObjectFromWalrus)());
router.get("/folder", (0, walrus_controller_1.getFolderContents)());
router.get("/search", (0, walrus_controller_1.searchFiles)());
router.get("/files/all", (0, walrus_controller_1.getAllUserFiles)());
router.delete("/file/:walrusId", (0, walrus_controller_1.deleteNode)());
router.delete("/node/:id", (0, walrus_controller_1.deleteNode)());
router.post("/collaborator/:id", (0, walrus_controller_1.addCollaborator)());
router.delete("/collaborator/:id/:userId", (0, walrus_controller_1.removeCollaborator)());
router.get("/collaborator/:id", (0, walrus_controller_1.getCollaborators)());
router.get("/tree", (0, walrus_controller_1.getTreeStructure)());
router.patch("/move/:id", (0, walrus_controller_1.moveNode)());
router.post("/upload", upload.any(), (0, walrus_controller_1.uploadFile)());
router.get("/file/:walrusId/view", (0, walrus_controller_1.getFile)());
exports.default = router;
//# sourceMappingURL=walrus.route.js.map