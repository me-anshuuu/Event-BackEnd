import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import "dotenv/config";

import serviceRouter from "./routes/serviceRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import authRouter from "./routes/authRoute.js";

// app config
const app = express();

// middleware
app.use(express.json());
app.use(cors({ origin: "*" }));

// ===== MongoDB Connection (cached for Vercel) =====
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const db = await mongoose.connect(process.env.MONGO_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Error:", error);
    throw error;
  }
};

// connect before handling request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ===== Routes =====
app.use("/api/service", serviceRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", orderRouter);
app.use("/api/auth", authRouter);
app.use("/images", express.static("uploads"));

// ===== Health Check =====
app.get("/api/health-check", async (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  res.json({
    status: "ok",
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ===== Root =====
app.get("/", (req, res) => {
  res.send("API Working");
});

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: "Internal Server Error",
  });
});

// ===== Export for Vercel =====
export default app;
