"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const collaboratorSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    accessLevel: {
        type: String,
        enum: ["read", "write", "admin"],
        required: true,
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
});
const fileSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    path: {
        type: String,
        required: true,
    },
    isFile: {
        type: Boolean,
        required: true,
    },
    parent: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "File",
        default: null,
    },
    children: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "File",
        },
    ],
    collaborators: [collaboratorSchema],
    isDeleted: {
        type: Boolean,
        default: false,
    },
    // File-specific properties
    blobId: {
        type: String,
        required: function () {
            return this.isFile;
        },
    },
    walrusId: {
        type: String,
        required: function () {
            return this.isFile;
        },
    },
    metadata: {
        filename: String,
        mimetype: String,
        size: Number,
        uploadedAt: String,
    },
}, {
    timestamps: true,
});
// Indexes for better query performance
fileSchema.index({ userId: 1, path: 1 });
fileSchema.index({ parent: 1 });
fileSchema.index({ isDeleted: 1 });
fileSchema.index({ "collaborators.userId": 1 });
exports.default = (0, mongoose_1.model)("File", fileSchema);
//# sourceMappingURL=file.model.js.map