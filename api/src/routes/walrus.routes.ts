import { Router } from "express";
import {
  addObjectToWalrus,
  getObjectFromWalrus,
  getFolderContents,
  searchFiles,
  deleteFile,
  getAllUserFiles,
  addCollaborator,
  removeCollaborator,
  getCollaborators,
} from "../controller/walrus.controller";

const router = Router();

router.post("/upload", addObjectToWalrus());
router.get("/file/:walrusId", getObjectFromWalrus());
router.get("/folder", getFolderContents());
router.get("/search", searchFiles());
router.delete("/file/:walrusId", deleteFile());
router.get("/files", getAllUserFiles());

router.post("/collaborator/:id", addCollaborator());
router.delete("/collaborator/:id/:userId", removeCollaborator());
router.get("/collaborator/:id", getCollaborators());

export default router;
