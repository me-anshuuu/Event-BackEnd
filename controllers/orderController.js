import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import Order from "../models/orderModel.js";
import { log } from "console";
import mongoose from "mongoose";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.status(200).json(razorpayOrder);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: error.message });
  }
};

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail", // Use your email service provider
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

// Helper function to format price
const formatPrice = (price) => {
  return parseFloat(price).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    style: 'currency',
    currency: 'INR'
  });
};

// Format date to readable format
const formatDate = (dateString) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

// Verify Payment and Send OTP
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, userDetails, services, amount } = req.body;

    // Validate required fields
    if (!orderId || !paymentId || !userDetails || !services || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Set OTP expiration time (e.g., 10 minutes from now)
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Map services to their ObjectId references
    const serviceIds = services.map((service) => service.name);

    // Create new order in DB
    const newOrder = new Order({
      orderId,
      paymentId,
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      status: "paid",
      userDetails: { ...userDetails, serviceDate: userDetails.serviceDate },
      services: serviceIds,
      otp,
      otpExpiresAt,
    });

    await newOrder.save();

    // Format service names for email
    const serviceNames = services.map(service => service.name).join(', ');
    
    // Format service date for display
    const formattedServiceDate = formatDate(userDetails.serviceDate);
    
    // Create HTML content for the email
    const createEmailHTML = (isAdmin = false) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
          }
          .email-container {
            border: 1px solid #e9e9e9;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
          }
          .header {
            background-color: #6c63ff;
            color: white;
            padding: 15px;
            text-align: center;
            border-radius: 5px 5px 0 0;
            margin: -20px -20px 20px;
          }
          .footer {
            background-color: #f8f8f8;
            padding: 15px;
            text-align: center;
            border-radius: 0 0 5px 5px;
            margin: 20px -20px -20px;
            font-size: 14px;
            color: #666;
          }
          .order-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .order-id {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .otp-container {
            background-color: #f0f7ff;
            border: 1px dashed #6c63ff;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          .otp-code {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #6c63ff;
            margin: 10px 0;
          }
          .text-center {
            text-align: center;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
          }
          .info-label {
            font-weight: bold;
            color: #555;
          }
          .amount {
            font-weight: bold;
            color: #6c63ff;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h2 style="margin: 0;">Homease Services</h2>
            <p style="margin: 5px 0 0 0;">${isAdmin ? 'New Order Confirmation' : 'Your Order Confirmation'}</p>
          </div>
          
          <p>${isAdmin ? 'A new order has been placed' : `Dear ${userDetails.firstName},`}</p>
          <p>${isAdmin ? 'Here are the details:' : 'Thank you for choosing Homease Services! Your order has been successfully placed.'}</p>
          
          <div class="order-details">
            <div class="order-id">Order ID: ${orderId}</div>
            <div class="info-row">
              <span class="info-label">Payment ID:</span>
              <span>${paymentId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Service(s):</span>
              <span>${serviceNames}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Service Date:</span>
              <span>${formattedServiceDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Amount:</span>
              <span class="amount">${formatPrice(amount)}</span>
            </div>
          </div>
          
          <div class="otp-container">
            <p style="margin: 0;">Order Verification OTP</p>
            <div class="otp-code">${otp}</div>
            
          </div>
          
          ${isAdmin ? `
          <h3 class="title">Customer Details:</h3>
          <div class="order-details">
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span>${userDetails.firstName} ${userDetails.lastName || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span>${userDetails.email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span>${userDetails.phone}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span>${userDetails.street}, ${userDetails.city}, ${userDetails.state} - ${userDetails.pincode}</span>
            </div>
          </div>
          ` : ''}
          
          <p>${isAdmin ? 'This OTP has been sent to the customer for verification.' : 'Please use this OTP to verify your order when our service provider contacts you.'}</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Homease Services. All rights reserved.</p>
            <p>For any inquiries, please contact us at ${process.env.EMAIL_USER}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send OTP email to the customer
    const customerMailOptions = {
      from: `"Homease Services" <${process.env.EMAIL_USER}>`,
      to: userDetails.email,
      subject: "Your Order Confirmation and Verification OTP - Homease Services",
      html: createEmailHTML(false),
    };

    // Send a copy to admin
    const adminMailOptions = {
      from: `"Homease Services" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Admin email
      subject: `New Order Received - ${orderId}`,
      html: createEmailHTML(true),
    };

    // Send email to customer
    transporter.sendMail(customerMailOptions, (error, info) => {
      if (error) {
        console.error("Error sending customer OTP email:", error);
      } else {
        console.log("Customer OTP email sent:", info.response);
      }
    });

    // Send email to admin
    transporter.sendMail(adminMailOptions, (error, info) => {
      if (error) {
        console.error("Error sending admin notification email:", error);
      } else {
        console.log("Admin notification email sent:", info.response);
      }
    });

    res.status(200).json({
      message: "Payment Verified and Order Created Successfully",
      otp,
    });
  } catch (error) {
    console.error("Error in verifyPayment:", error);
    res.status(500).json({ error: error.message });
  }
};

// Fetch all orders with service details
export const getOrders = async (req, res) => {
  try {
    // const orders = await Order.find()
    //   .populate({
    //     path: "services", // Populate the services field
    //     // Select only the name and quantity fields
    //   })
    //   .exec();
    const orders = await Order.find().populate("service").exec();

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// Fetch a single order by ID with service details
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate({
        path: "services",
      })
      .exec();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingStatus, notes } = req.body; // Get the new status from the request body
    const { id } = req.params; // Get the order ID from the URL params

    // Find the order
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const updateData = {};
    
    // Update payment status if provided
    if (status) {
      if (!["initiated", "in progress", "completed"].includes(status.toLowerCase())) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      updateData.status = status.toLowerCase();
    }
    
    // Update tracking status if provided
    if (trackingStatus) {
      if (!['order_placed', 'confirmed', 'processing', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled'].includes(trackingStatus)) {
        return res.status(400).json({ message: "Invalid tracking status value" });
      }
      updateData.trackingStatus = trackingStatus;
      
      // Add to tracking history
      const historyEntry = {
        status: trackingStatus,
        timestamp: new Date(),
        notes: notes || `Order status updated to ${trackingStatus}`
      };
      
      if (!order.trackingHistory) {
        order.trackingHistory = [];
      }
      
      order.trackingHistory.push(historyEntry);
    }
    
    // Apply updates
    Object.assign(order, updateData);
    await order.save();

    res.status(200).json(order); // Return the updated order
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { orderId, otp, role } = req.body; // `role` can be "admin" or "customer"

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.otp !== otp || order.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (role === "admin") {
      order.verifiedByAdmin = true;
    } else if (role === "customer") {
      order.verifiedByCustomer = true;
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    await order.save();

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// New endpoint to get user orders by email
export const getUserOrders = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    const orders = await Order.find({"userDetails.email": email})
      .populate('services')
      .sort({ createdAt: -1 })
      .exec();
      
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Failed to fetch user orders" });
  }
};

// New endpoint to get order tracking details
export const getOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id)
      .select('orderId trackingStatus trackingHistory createdAt userDetails.serviceDate')
      .exec();
      
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order tracking:", error);
    res.status(500).json({ message: "Failed to fetch order tracking" });
  }
};
