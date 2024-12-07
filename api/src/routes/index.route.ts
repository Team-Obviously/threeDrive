import authRouter from "./auth.route";
import usersRouter from "./user.route";
import passport from "passport";
import walrusRouter from "./walrus.route";
import { attatchUser } from "../middleware/util/auth.middleware";
export const routes = (app: any) => {
  app.use("/api/walrus", walrusRouter);
  // app.use("/api/walrus", attatchUser, walrusRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
};
