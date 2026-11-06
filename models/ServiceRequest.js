const mongoose = require("mongoose");

const CATEGORIES = [
  "Electricity",
  "Plumbing",
  "AC / Cooling",
  "Internet / Network",
  "Appliance",
  "Carpentry",
  "Painting",
  "Cleaning",
  "Other",
];

const serviceRequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "CANCELLED"],
      default: "PENDING",
    },
    attachments: [
      {
        url: String,
        type: { type: String },
        originalName: String,
        format: String,
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
module.exports.CATEGORIES = CATEGORIES;
