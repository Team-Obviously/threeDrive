import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/utils";
import Users from "../models/user.model";
import { initializeUserFileStructure } from "./walrus.controller";

export const addUser = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { emailId } = req.body;

      let user = await Users.findOne({ emailId });

      if (user) {
        return res.status(200).json({
          status: "success",
          message: "User already exists",
          data: user,
        });
      }

      user = await Users.create(req.body);

      // await initializeUserFileStructure(user._id.toString());

      return res.status(201).json({
        status: "success",
        message: "User created successfully",
        data: user,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          status: "error",
          message: "Email already exists",
        });
      }
      next(error);
    }
  });
