import mongoose from "mongoose";

const ServiceSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    receipt: { type: String, required: true },
    status: { type: String, default: "created" },
    trackingStatus: { 
      type: String, 
      enum: ['order_placed', 'confirmed', 'processing', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'order_placed'
    },
    paymentId: { type: String },
    otp: { type: String }, // OTP for verification
    otpExpiresAt: { type: Date }, // OTP expiration time
    verifiedByAdmin: { type: Boolean, default: false }, // Admin verification
    verifiedByCustomer: { type: Boolean, default: false }, // Customer verification
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "service" }], // Reference to Service model
    userDetails: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      serviceDate: String,
    },
    trackingHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        notes: String
      }
    ]
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
