import { Router } from "express";
import {
  addObjectToWalrus,
  getObjectFromWalrus,
  getFolderContents,
  searchFiles,
  getAllUserFiles,
  addCollaborator,
  removeCollaborator,
  getCollaborators,
  getTreeStructure,
  moveNode,
  uploadFile,
  getFile,
  deleteNode,
  createFolder,
  updateFileContent,
} from "../controller/walrus.controller";
import multer from "multer";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/", upload.any(), addObjectToWalrus());
router.post("/folder", createFolder());
router.get("/file/:walrusId", getObjectFromWalrus());
router.get("/folder", getFolderContents());
router.get("/search", searchFiles());
router.get("/files/all", getAllUserFiles());
router.delete("/file/:walrusId", deleteNode());
router.delete("/node/:id", deleteNode());

router.post("/collaborator/:id", addCollaborator());
router.delete("/collaborator/:id/:userId", removeCollaborator());
router.get("/collaborator/:id", getCollaborators());

router.get("/tree", getTreeStructure());
router.patch("/move/:id", moveNode());

router.post("/upload", upload.any(), uploadFile());
router.get("/file/:walrusId/view", getFile());
router.put("/file/:fileId/content", upload.any(), updateFileContent());

export default router;
