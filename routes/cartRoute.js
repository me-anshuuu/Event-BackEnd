import express from "express";
import {
  addToCart,
  removeFromCart,
  getCart,
} from "../controllers/cartController.js";

const cartRouter = express.Router();

cartRouter.post("/add", addToCart);
cartRouter.post("/remove", removeFromCart);
cartRouter.post("/get", async (req, res, next) => {
  if (!req.body.userId) {
    return res
      .status(400)
      .json({ success: false, message: "User ID is required" });
  }
  next();
});

export default cartRouter;
