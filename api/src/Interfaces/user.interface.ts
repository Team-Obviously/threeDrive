import { ObjectId, Document } from "mongoose";

export interface IUser extends Document {
  _id: ObjectId;
  emailId: string;
  createdAt: string;
}
