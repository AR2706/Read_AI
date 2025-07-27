import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("Summary will appear here...");
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ rating: "", comment: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null); // State to hold error messages

  // Determine the backend base URL dynamically
  // In production (Hugging Face Spaces), Nginx will proxy /api to the backend service
  // In development, it will default to localhost:5000
  const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? window.location.origin + '/api' // Nginx proxies /api to backend
    : "http://localhost:5000"; // For local development

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setError(null); // Clear any previous errors
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first."); // Use alert for immediate user feedback
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data' // Important for file uploads
        }
      });
      setSummary(response.data.summary);
      setChunks(response.data.chunks || []);
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Error processing the PDF. Please try again or check the file format.");
      setSummary("Error processing the PDF."); // Display generic error in summary box
    }
    setLoading(false);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    // Check if feedback is enabled (i.e., if the backend route is active)
    // In the current free-tier deployment strategy, this route is commented out in server.js
    // If you enable MongoDB later, uncomment this block.
    // For now, we'll prevent submission if the backend route is not expected to work.
    if (process.env.NODE_ENV === 'production') {
        alert("Feedback submission is currently disabled in the deployed version due to database limitations on the free tier.");
        return;
    }

    try {
      await axios.post(`${API_BASE_URL}/feedback`, feedback);
      setSubmitted(true);
      setFeedback({ rating: "", comment: "" });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error("Feedback submission error", err);
      alert("Failed to submit feedback. Please try again later."); // Use alert for immediate user feedback
    }
  };

  return (
    <div className="container">
      <h1>📄 PDF Summarizer</h1>

      <div className="upload-box">
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={loading}>
          {loading ? "Processing..." : "Summarize"}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>} {/* Display error message */}

      <div className="summary-box">
        <h2>📝 Summary</h2>
        <p>{summary}</p>
      </div>

      {chunks.length > 0 && (
        <div className="chunks">
          <h2>📚 Questions & Answers</h2>
          {chunks.map((chunk, index) => (
            <div key={index} className="chunk">
              <h3>Chunk {index + 1}</h3>
              <p><strong>Chunk Summary:</strong> {chunk.summary}</p>
              <ul>
                {chunk.questions.map((q, i) => (
                  <li key={i}>
                    <strong>Q:</strong> {q}<br />
                    <strong>A:</strong> {chunk.answers[q] || "No answer found"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Feedback section - conditionally rendered based on your deployment strategy */}
      {/* For free tier deployment, this section will be effectively disabled or removed */}
      {/* If you enable MongoDB later, ensure the backend route is active and uncomment this block. */}
      {/* This is commented out in the React code as well, but this comment serves as a reminder */}
      {/* to uncomment this section if you ever re-enable the backend feedback route. */}
      {/*
      <div className="feedback-section">
        <h2>💬 Leave Feedback</h2>
        <form onSubmit={handleFeedbackSubmit}>
          <label>
            Rating:
            <select
              value={feedback.rating}
              onChange={(e) => setFeedback({ ...feedback, rating: e.target.value })}
              required
            >
              <option value="">Select</option>
              <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
              <option value="4">⭐⭐⭐⭐ Good</option>
              <option value="3">⭐⭐⭐ Average</option>
              <option value="2">⭐⭐ Poor</option>
              <option value="1">⭐ Very Poor</option>
            </select>
          </label>

          <label>
            Comments:
            <textarea
              value={feedback.comment}
              onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
              placeholder="Tell us what you think..."
              required
            />
          </label>

          <button type="submit">Submit Feedback</button>
        </form>

        {submitted && <p className="thank-you">Thank you for your feedback! 🎉</p>}
      </div>
      */}
    </div>
  );
};

export default App;
