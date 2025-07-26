import pickle
import sys
import re
import json
import logging
import pdfplumber

# Setup logging
logging.basicConfig(level=logging.INFO)

# Load model.pkl
with open("./model2.pkl", "rb") as file:
    model = pickle.load(file)

# Extract model components
summarizer = model.get("summarizer")
qg_pipeline = model.get("qg_pipeline")
qa_pipeline = model.get("qa_pipeline")

if not summarizer or not qg_pipeline or not qa_pipeline:
    raise ValueError("Error: model.pkl does not contain the necessary components!")

# Function to extract and clean text from a PDF using pdfplumber
def extract_text_from_pdf(pdf_path):
    try:
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        text = re.sub(r'[^\x00-\x7F]+', ' ', text)  # Remove non-ASCII characters
        return text.strip()
    except Exception as e:
        logging.error(f"Failed to extract text from PDF using pdfplumber: {e}")
        return ""

# Function to split text into chunks
def chunk_text(text, max_tokens=512, overlap=50):
    words = text.split()
    chunks = []
    for i in range(0, len(words), max_tokens - overlap):
        chunks.append(" ".join(words[i:i + max_tokens]))
    return chunks

# Process PDF
def process_pdf(pdf_path):
    text = extract_text_from_pdf(pdf_path)
    if not text:
        raise ValueError("Error: PDF contains no extractable text.")

    text_chunks = chunk_text(text)
    results = []

    for chunk in text_chunks:
        chunk_result = {}

        # Generate summary
        try:
            input_length = len(chunk.split())
            max_len = min(150, int(input_length * 0.7))
            min_len = int(max_len * 0.2)
            if min_len < 5: # Absolute minimum length for a summary
                min_len = 5
            if min_len > max_len: # Ensure min_len never exceeds max_len
                min_len = max_len
            chunk_summary = summarizer(chunk, max_length=max_len, min_length=min_len, do_sample=False)[0]["summary_text"]
            chunk_result["summary"] = chunk_summary
        except Exception as e:
            logging.warning(f"Summary generation failed: {e}")
            chunk_result["summary"] = "Summary not available."

        # Generate questions
        questions = []
        try:
            qg_input = f"generate questions: {chunk}"
            questions_output = qg_pipeline(qg_input)
            questions = [q["generated_text"] for q in questions_output if "generated_text" in q]
            questions = list(set(questions))[:3]  # Limit to 3 questions
        except Exception as e:
            logging.warning(f"Question generation failed: {e}")
        chunk_result["questions"] = questions

        # Generate answers
        answers = {}
        for q in questions:
            best_answer = "No answer found"
            try:
                answer_output = qa_pipeline(question=q, context=chunk)
                best_answer = answer_output.get("answer", "No answer found")
            except Exception as e:
                logging.warning(f"Answer generation failed for question '{q}': {e}")
            answers[q] = best_answer
        chunk_result["answers"] = answers

        results.append(chunk_result)

    return {
        "summary": "\n\n".join([chunk["summary"] for chunk in results]),
        "chunks": results
    }

# Entry point
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python run_model.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]

    try:
        output = process_pdf(pdf_path)
        print(json.dumps(output))
    except Exception as e:
        logging.error(f"Unhandled exception: {e}")
        print(json.dumps({"error": str(e)}))
