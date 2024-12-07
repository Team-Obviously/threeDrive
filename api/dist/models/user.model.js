"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const UserSchema = new mongoose_1.default.Schema({
    emailId: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
    },
}, {
    timestamps: true,
});
UserSchema.set("toJSON", { virtuals: true });
const UserModel = mongoose_1.default.model("Users", UserSchema);
exports.default = UserModel;
//# sourceMappingURL=user.model.js.map