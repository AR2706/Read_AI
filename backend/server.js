require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Feedback schema
const feedbackSchema = new mongoose.Schema({
  rating: String,
  comment: String,
  createdAt: { type: Date, default: Date.now },
});
const Feedback = mongoose.model("Feedback", feedbackSchema);

// Multer file upload
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Upload route
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const filePath = path.resolve(__dirname, req.file.path);
  const python = spawn("python3", ["run_model.py", filePath]);

  let outputData = "";
  let errorData = "";

  python.stdout.on("data", (data) => (outputData += data.toString()));
  python.stderr.on("data", (data) => (errorData += data.toString()));

  python.on("close", (code) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Failed to delete uploaded file:", err);
      } else {
        console.log("Uploaded file deleted:", filePath);
      }
    });

    if (errorData) {
      console.error("Python error:", errorData);
    }

    try {
      const result = JSON.parse(outputData);

      // Return full structured result including:
      // { summary: string, chunks: [ { summary, questions, answers } ] }
      res.json(result);
    } catch (err) {
      console.error("Failed to parse model output:", err);
      res.status(500).json({ error: "Error parsing model output." });
    }
  });
});

// Feedback route
app.post("/feedback", async (req, res) => {
  try {
    const feedback = new Feedback(req.body);
    await feedback.save();
    res.status(201).json({ message: "Feedback saved successfully!" });
  } catch (err) {
    console.error("Error saving feedback:", err);
    res.status(500).json({ error: "Failed to save feedback." });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("📄 PDF Summarizer backend is running.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
