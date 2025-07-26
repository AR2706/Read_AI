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

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first.");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/upload", formData);
      setSummary(response.data.summary);
      setChunks(response.data.chunks || []);
    } catch (error) {
      console.error("Error uploading file:", error);
      setSummary("Error processing the PDF.");
    }
    setLoading(false);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/feedback", feedback);
      setSubmitted(true);
      setFeedback({ rating: "", comment: "" });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error("Feedback submission error", err);
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
    </div>
  );
};

export default App;
