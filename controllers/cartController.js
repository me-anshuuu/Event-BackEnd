import userModel from "../models/userModel.js";

// Helper function to find user by ID (either _id or userCode)
const findUserById = async (userId) => {
  // Try finding by _id first
  let user = await userModel.findById(userId).catch(() => null);
  
  // If not found by _id, try finding by userCode
  if (!user) {
    user = await userModel.findOne({ userCode: userId });
  }
  
  return user;
};

// add items to user cart
const addToCart = async (req, res) => {
  try {
    if (!req.body.userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    
    const userData = await findUserById(req.body.userId);
    
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Initialize cartData if it doesn't exist
    if (!userData.cartData) {
      userData.cartData = {};
    }
    
    let cartData = userData.cartData;
    if (!cartData[req.body.itemId]) {
      cartData[req.body.itemId] = 1;
    } else {
      cartData[req.body.itemId] += 1;
    }
    
    userData.cartData = cartData;
    await userData.save();
    
    res.json({ success: true, message: "Added To Cart" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error adding to cart" });
  }
};

// remove items from user cart
const removeFromCart = async (req, res) => {
  try {
    if (!req.body.userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    
    const userData = await findUserById(req.body.userId);
    
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Initialize cartData if it doesn't exist
    if (!userData.cartData) {
      userData.cartData = {};
    }
    
    let cartData = userData.cartData;
    if (cartData[req.body.itemId] > 0) {
      cartData[req.body.itemId] -= 1;
    }
    
    userData.cartData = cartData;
    await userData.save();
    
    res.json({ success: true, message: "Removed From Cart" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error removing from cart" });
  }
};

// fetch user cart data
const getCart = async (req, res) => {
  try {
    if (!req.body.userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    
    const userData = await findUserById(req.body.userId);

    // Check if userData exists
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const cartData = userData.cartData || {}; // Fallback to an empty object if cartData is undefined
    res.json({ success: true, cartData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error fetching cart data" });
  }
};

const clearCart = async (req, res) => {
  try {
    if (!req.body.userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    
    const userData = await findUserById(req.body.userId);
    
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    userData.cartData = {}; // Clear the cart
    await userData.save();
    res.json({ success: true, message: "Cart cleared successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error clearing cart" });
  }
};

export { addToCart, removeFromCart, getCart, clearCart };
