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
exports.addUser = void 0;
const utils_1 = require("../utils/utils");
const user_model_1 = __importDefault(require("../models/user.model"));
const walrus_controller_1 = require("./walrus.controller");
const addUser = () => (0, utils_1.catchAsync)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { emailId } = req.body;
        let user = yield user_model_1.default.findOne({ emailId });
        if (user) {
            return res.status(200).json({
                status: "success",
                message: "User already exists",
                data: user,
            });
        }
        user = yield user_model_1.default.create(req.body);
        yield (0, walrus_controller_1.initializeUserFileStructure)(user._id.toString());
        return res.status(201).json({
            status: "success",
            message: "User created successfully",
            data: user,
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: "error",
                message: "Email already exists",
            });
        }
        next(error);
    }
}));
exports.addUser = addUser;
//# sourceMappingURL=user.controller.js.map