const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Authentication: verify JWT, then load the real user (and role) from the DB
exports.protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Please login first" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id email role");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    req.user = { id: user._id.toString(), email: user.email, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session expired, please login again" });
  }
};

// Authorization: admin only
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });
  }
  next();
};
