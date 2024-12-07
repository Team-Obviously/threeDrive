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
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSigninValidator = exports.userSignupValidator = void 0;
const express_validator_1 = require("express-validator");
exports.userSignupValidator = [
    (0, express_validator_1.check)("firstName").not().isEmpty().withMessage("First Name is required"),
    (0, express_validator_1.check)("lastName").not().isEmpty().withMessage("Last Name is required"),
    (0, express_validator_1.check)("emailId").isEmail().withMessage("Must be a valid email address"),
    (0, express_validator_1.check)("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least  6 characters long"),
    (0, express_validator_1.check)("confirmPassword")
        .notEmpty()
        .withMessage("Confirm Password should not be empty")
        .custom((confirmPassword_1, _a) => __awaiter(void 0, [confirmPassword_1, _a], void 0, function* (confirmPassword, { req }) {
        if (confirmPassword !== req.body.password) {
            throw new Error("Password confirmation does not match with password");
        }
        return true;
    })),
];
exports.userSigninValidator = [
    (0, express_validator_1.check)("emailId").isEmail().withMessage("Must be a valid email address"),
    (0, express_validator_1.check)("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least  6 characters long"),
];
//# sourceMappingURL=auth.validator.js.map