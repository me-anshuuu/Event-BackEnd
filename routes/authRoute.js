import express from "express";
import {
  requestOtp,
  signUp,
  login,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.post("/request-otp", requestOtp);
authRouter.post("/signup", signUp);
authRouter.post("/login", login);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);

export default authRouter;
