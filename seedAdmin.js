// Usage:  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret123 npm run seed:admin
// Creates (or promotes) an admin account. Public signup can never create admins.
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");

(async () => {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Set ADMIN_EMAIL and ADMIN_PASSWORD first");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  let user = await User.findOne({ email });
  const hashed = await bcrypt.hash(password, 10);
  if (user) {
    user.role = "admin";
    user.password = hashed;
    await user.save();
  } else {
    user = await User.create({ email, password: hashed, role: "admin" });
  }
  console.log("Admin ready:", user.email);
  process.exit(0);
})();
