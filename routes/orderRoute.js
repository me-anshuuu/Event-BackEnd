import express from "express";
import {
  createOrder,
  verifyPayment,
  getOrders,
  getOrderById,
  updateOrderStatus,
  verifyOtp,
  getUserOrders,
  getOrderTracking
} from "../controllers/orderController.js";
import Order from "../models/orderModel.js";
import mongoose from "mongoose";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/orders", getOrders); // Add this to fetch all orders
router.get("/orders/:id", getOrderById); // Fetch single order details
router.put("/:id/status", updateOrderStatus); // Update order status
router.post("/verify-otp", verifyOtp); // Add this route for OTP verification
router.get("/user/:email", getUserOrders); // Get orders by user email
router.get("/:id/tracking", getOrderTracking); // Get order tracking details

// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().populate("services").exec(); // Fetch all orders from DB
    console.log(mongoose.modelNames());

    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Get single order by ID
router.get("/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
