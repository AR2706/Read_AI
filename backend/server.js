require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
// const mongoose = require("mongoose"); // Keep this line commented out for free tier deployment

const app = express();
const PORT = process.env.PORT || 7866; // Ensure this matches the exposed port in Dockerfile

app.use(express.json());
app.use(cors());

// --- MongoDB Connection (MUST BE COMMENTED OUT for Hugging Face Spaces Free Tier) ---
// Free tier of Hugging Face Spaces typically restricts outbound connections to external databases.
// To enable this, you would usually need to upgrade your Space or use a different deployment strategy.
/*
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
*/
// --- End MongoDB Section ---


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

  // Ensure the 'uploads' directory exists
  const uploadsDir = path.resolve(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
  }

  const filePath = path.resolve(uploadsDir, req.file.filename); // Use req.file.filename for the actual file name
  // Multer already saves the file to req.file.path, which is in the 'uploads' directory.
  // We just need to make sure the path is correct for python.spawn
  const pythonScriptPath = path.resolve(__dirname, 'run_model.py');
  const python = spawn("python3", [pythonScriptPath, filePath]);

  let outputData = "";
  let errorData = "";

  python.stdout.on("data", (data) => (outputData += data.toString()));
  python.stderr.on("data", (data) => (errorData += data.toString()));

  python.on("close", (code) => {
    fs.unlink(filePath, (err) => { // Use filePath to delete the file
      if (err) {
        console.error("Failed to delete uploaded file:", err);
      } else {
        console.log("Uploaded file deleted:", filePath);
      }
    });

    if (errorData) {
      console.error("Python error:", errorData);
      // It's good practice to send the Python error back to the client for debugging
      return res.status(500).json({ error: "Python script error", details: errorData });
    }

    try {
      const result = JSON.parse(outputData);

      // Return full structured result including:
      // { summary: string, chunks: [ { summary, questions, answers } ] }
      res.json(result);
    } catch (err) {
      console.error("Failed to parse model output:", err);
      res.status(500).json({ error: "Error parsing model output. Raw output: " + outputData.substring(0, Math.min(outputData.length, 500)) + "..." });
    }
  });
});

// --- Feedback route (Already commented out, keep it that way for free tier) ---
/*
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
*/
// --- End Feedback Section ---

// Test route
app.get("/", (req, res) => {
  res.send("📄 PDF Summarizer backend is running.");
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`); // Log 0.0.0.0 for clarity in Docker
});
