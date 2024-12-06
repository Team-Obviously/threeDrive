import { IUser } from "../Interfaces/user.interface";
import mongoose, { get } from "mongoose";
import crypto from "crypto";

const UserSchema = new mongoose.Schema<IUser>(
  {
    emailId: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.set("toJSON", { virtuals: true });

const UserModel = mongoose.model<IUser>("Users", UserSchema);

export default UserModel;
