import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/utils";
import Users from "../models/user.model";
import AppError from "../utils/appError";

export const addUser = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await Users.create(req.body);
      if (!user) {
        return next(new AppError("Failed to create user", 400));
      }

      res.status(201).json({
        status: "success",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  });
