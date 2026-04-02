// import mongoose from "mongoose"

// export const connectDB = async () => {
//     await mongoose.connect('mongodb+srv://Sakshi:Homease@cluster0.jum4d.mongodb.net/Homease').then(()=>console.log("DB Connected"));
// }


import mongoose from "mongoose";

export const connectDB = async () => {
    const MONGODB_URI = "mongodb+srv://ajayoneness123:codeAj%402263@cluster0.9b1y9ga.mongodb.net/Homease?retryWrites=true&w=majority&appName=Cluster0";

    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ DB Connected Successfully");
    } catch (error) {
        console.error("❌ DB Connection Failed:", error);
        process.exit(1);
    }
};
