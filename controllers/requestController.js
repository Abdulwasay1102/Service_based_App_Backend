const mongoose = require("mongoose");
const ServiceRequest = require("../models/ServiceRequest");
const cloudinary = require("../config/cloudinary");

const { CATEGORIES } = ServiceRequest;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED", "CANCELLED"];

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const isOwner = (request, userId) =>
  (request.user._id || request.user).toString() === userId;

// Upload one file buffer to Cloudinary
const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const type = file.mimetype.startsWith("image")
      ? "image"
      : file.mimetype.startsWith("video")
        ? "video"
        : "raw";
    const stream = cloudinary.uploader.upload_stream(
      { folder: "servicehub", resource_type: type === "file" ? "raw" : type },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          type: type === "raw" ? "file" : type,
          originalName: file.originalname,
          format: file.originalname.split(".").pop(),
        });
      },
    );
    stream.end(file.buffer);
  });

// POST /api/requests
exports.createRequest = async (req, res) => {
  try {
    const { title, category, description, priority } = req.body;
    if (!title?.trim() || !category || !description?.trim() || !priority) {
      return res
        .status(400)
        .json({ message: "Title, category, description and priority are required" });
    }
    if (!CATEGORIES.includes(category) || !PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "Invalid category or priority" });
    }

    // Attachments are optional - never let them break request creation
    let attachments = [];
    const files = req.files || [];
    if (files.length > 0 && cloudinary.isConfigured()) {
      try {
        attachments = await Promise.all(files.map(uploadToCloudinary));
      } catch (e) {
        console.log("Attachment upload failed:", e.message);
      }
    }

    const request = await ServiceRequest.create({
      title,
      category,
      description,
      priority,
      attachments,
      status: "PENDING",
      user: req.user.id,
    });
    res.status(201).json({ message: "Request Created", request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/requests/my
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/requests/:id
exports.getRequest = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(404).json({ message: "Request not found" });
    }
    const request = await ServiceRequest.findById(req.params.id).populate(
      "user",
      "email role",
    );
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (req.user.role !== "admin" && !isOwner(request, req.user.id)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT/PATCH /api/requests/:id  (owner only, only while PENDING)
exports.updateRequest = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(404).json({ message: "Request not found" });
    }
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (!isOwner(request, req.user.id)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    if (request.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Only pending requests can be edited" });
    }
    const { title, description, priority, category } = req.body;
    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }
    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }
    // status and user are never taken from the body
    if (title?.trim()) request.title = title;
    if (description?.trim()) request.description = description;
    if (priority) request.priority = priority;
    if (category) request.category = category;
    await request.save();
    res.json({ message: "Request Updated", request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/requests/:id  (owner: only while PENDING/CANCELLED; admin: any)
exports.deleteRequest = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(404).json({ message: "Request not found" });
    }
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (req.user.role !== "admin") {
      if (!isOwner(request, req.user.id)) {
        return res
          .status(403)
          .json({ message: "You are not authorized to perform this action" });
      }
      if (!["PENDING", "CANCELLED"].includes(request.status)) {
        return res.status(400).json({
          message: "Requests that are in progress or resolved cannot be deleted",
        });
      }
    }
    await request.deleteOne();
    res.json({ message: "Request Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN - GET /api/requests/all
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate("user", "email role")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN - PATCH /api/requests/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Use one of: ${STATUSES.join(", ")}`,
      });
    }
    if (!validId(req.params.id)) {
      return res.status(404).json({ message: "Request not found" });
    }
    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    ).populate("user", "email role");
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ message: "Status updated", request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
