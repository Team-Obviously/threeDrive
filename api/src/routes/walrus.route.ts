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
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.any(), addObjectToWalrus());
router.get("/file/:walrusId", getObjectFromWalrus());
router.get("/folder", getFolderContents());
router.get("/search", searchFiles());
router.get("/files/all", getAllUserFiles());
router.delete("/file/:walrusId", deleteFile());

router.post("/collaborator/:id", addCollaborator());
router.delete("/collaborator/:id/:userId", removeCollaborator());
router.get("/collaborator/:id", getCollaborators());

export default router;
