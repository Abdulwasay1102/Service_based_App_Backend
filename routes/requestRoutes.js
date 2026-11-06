const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  createRequest,
  getMyRequests,
  getRequest,
  updateRequest,
  deleteRequest,
  updateStatus,
  getAllRequests,
} = require("../controllers/requestController");

// USER
router.post("/", protect, upload.array("attachments", 5), createRequest);
router.get("/my", protect, getMyRequests);

// ADMIN (must be before "/:id" routes)
router.get("/all", protect, isAdmin, getAllRequests);
router.patch("/:id/status", protect, isAdmin, updateStatus);

// USER (own) / ADMIN (any)
router.get("/:id", protect, getRequest);
router.put("/:id", protect, updateRequest);
router.patch("/:id", protect, updateRequest);
router.delete("/:id", protect, deleteRequest);

module.exports = router;
