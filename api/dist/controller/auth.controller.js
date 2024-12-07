"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passportInit = exports.signin = exports.signup = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const jsonwebtoken_1 = require("jsonwebtoken");
const passport_jwt_1 = __importDefault(require("passport-jwt"));
const signup = (req, res) => {
    const { firstName, lastName, emailId, password, confirmPassword, mobile_number, } = req.body;
    user_model_1.default.findOne({ emailId: emailId })
        .then((user) => {
        if (user) {
            return res.status(400).json({
                error: "Email is taken",
            });
        }
        const newUser = new user_model_1.default({
            firstName,
            lastName,
            emailId,
            password,
            confirmPassword,
        });
        newUser
            .save()
            .then((savedUser) => {
            var _a;
            const jwtToken = (0, jsonwebtoken_1.sign)({ _id: savedUser._id }, (_a = process.env.JWT_SECRET) !== null && _a !== void 0 ? _a : "", {
                expiresIn: "100h",
            });
            return res.status(200).json({
                message: "success",
                jwtToken,
                user: savedUser,
            });
        })
            .catch((err) => {
            if (err) {
                return res.status(401).json({
                    error: err,
                });
            }
        });
    })
        .catch((err) => {
        if (err) {
            res.status(400).json({
                error: "Email is taken",
            });
        }
    });
};
exports.signup = signup;
const signin = (req, res) => {
    const { emailId, password } = req.body;
    user_model_1.default.findOne({ emailId })
        .then((user) => {
        var _a;
        if (!user.authenticate(password)) {
            return res.status(400).json({
                error: "Email and password do not match",
            });
        }
        const jwtToken = (0, jsonwebtoken_1.sign)({ _id: user._id }, (_a = process.env.JWT_SECRET) !== null && _a !== void 0 ? _a : "", {
            expiresIn: "100h",
        });
        res.cookie("jwt", jwtToken, {
            expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: req.secure || req.headers["x-forwarded-proto"] === "https",
        });
        return res.json({
            jwtToken,
            user: user,
        });
    })
        .catch((err) => {
        if (err) {
            return res.status(400).json({
                error: "User does not exist. Please signup",
                err,
            });
        }
    });
};
exports.signin = signin;
const JwtStrategy = passport_jwt_1.default.Strategy;
const passportInit = (passport) => {
    const jwtExtractor = function (req) {
        let token = null;
        if (req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        else if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }
        else if (req.cookies) {
            token = req.cookies["jwt"];
        }
        return token;
    };
    const options = {
        jwtFromRequest: jwtExtractor,
        secretOrKey: process.env.JWT_SECRET || "",
    };
    passport.use(new JwtStrategy(options, (jwtPayload, done) => {
        user_model_1.default.findOne({ _id: jwtPayload._id }).then((currUser) => {
            if (currUser) {
                done(null, currUser);
            }
        });
    }));
};
exports.passportInit = passportInit;
//# sourceMappingURL=auth.controller.js.map