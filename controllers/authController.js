const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// signup
exports.signUp = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedpassword = await bcrypt.hash(password, salt);
    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      return res.status(400).json({ message: "User already exist" });
    }
    // role is never taken from the request: always a normal "user"
    user = new User({ email, password: hashedpassword, role: "user" });
    await user.save();
    res.status(201).json({
      message: "Signup Successfully",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({ message: err.message });
  }
};

// login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const ismatched = await bcrypt.compare(password, user.password);
    if (!ismatched) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.json({
      message: "login successful",
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
exports.getProfile = async (req, res) => {
  res.json({ message: "User Profile", user: req.user });
};
exports.roleCheck = async (req, res) => {
  res.json({ message: "Admin Dashobard" });
};

//  change password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // get user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // comparing old password with new password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "old password is incorrect" });
    }

    //validation of the password
    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "password must be atlest 6 characters" });
    }
    // hashing the password
    const salt = await bcrypt.genSalt(10);
    const hashedpassword = await bcrypt.hash(newPassword, salt);

    // updating the password
    user.password = hashedpassword;
    await user.save();
    res.json({ message: "Password change successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// forgotPassword
// 2 API

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpire = Date.now() + 15 * 60 * 1000;
    await user.save();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetLink = `${clientUrl}/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `
                    <h2>Password Reset</h2>
                    <p>Click the button below to reset your password</p>
                    <a href="${resetLink}">Reset Password</a>
            `,
    });
    res.json({
      message: "password reset link sent to your email",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// reset password

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: {
        $gt: Date.now(),
        // $gt
      },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or Expired token" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedpassword = await bcrypt.hash(password, salt);
    user.password = hashedpassword;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();
    res.json({
      message: "Password Reset Successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


// logout