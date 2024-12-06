import { Router } from "express";
import { getAll, getOne, deleteOne } from "../controller/utils/handlerFactory";
import Users from "../models/user.model";
import { addUser } from "../controller/user.controller";
import { isOwner } from "../middleware/util/auth.middleware";

const router = Router();

router.route("/").get(getAll(Users)).post(addUser());

router.route("/:id").get(getOne(Users)).delete(isOwner, deleteOne(Users));

export default router;
