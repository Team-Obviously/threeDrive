"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const handlerFactory_1 = require("../controller/utils/handlerFactory");
const user_model_1 = __importDefault(require("../models/user.model"));
const user_controller_1 = require("../controller/user.controller");
const auth_middleware_1 = require("../middleware/util/auth.middleware");
const router = (0, express_1.Router)();
router.route("/").get((0, handlerFactory_1.getAll)(user_model_1.default)).post((0, user_controller_1.addUser)());
router.route("/:id").get((0, handlerFactory_1.getOne)(user_model_1.default)).delete(auth_middleware_1.isOwner, (0, handlerFactory_1.deleteOne)(user_model_1.default));
exports.default = router;
//# sourceMappingURL=user.route.js.map