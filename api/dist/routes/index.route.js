"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
const auth_route_1 = __importDefault(require("./auth.route"));
const user_route_1 = __importDefault(require("./user.route"));
const walrus_route_1 = __importDefault(require("./walrus.route"));
const auth_middleware_1 = require("../middleware/util/auth.middleware");
const routes = (app) => {
    // app.use("/api/walrus", walrusRouter);
    app.use("/api/walrus", auth_middleware_1.attatchUser, walrus_route_1.default);
    app.use("/api/auth", auth_route_1.default);
    app.use("/api/users", user_route_1.default);
};
exports.routes = routes;
//# sourceMappingURL=index.route.js.map