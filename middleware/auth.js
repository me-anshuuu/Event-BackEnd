// import DescopeClient from "@descope/node-sdk";

// const descopeClient = DescopeClient({
//   projectId: "P2uAdkoJmtbNNqL0EN7we3djMjV6",
// });

// const authMiddleware = async (req, res, next) => {
//   const { authorization } = req.headers;
//   if (!authorization) {
//     return res.status(401).json({ success: false, message: "Not Authorized" });
//   }
//   const sessionToken = authorization.split(" ")[1];
//   try {
//     const authInfo = await descopeClient.validateSession(sessionToken);
//     req.user = authInfo.user;
//     next();
//   } catch (error) {
//     console.log(error);
//     res.status(401).json({ success: false, message: "Invalid Token" });
//   }
// };

// export default authMiddleware;
