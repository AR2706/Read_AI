import pickle
import sys
import re
import json
import logging
import pdfplumber
from huggingface_hub import hf_hub_download # Import the download function

# Setup logging
logging.basicConfig(level=logging.INFO)

# --- Hugging Face Model Loading ---
# Define your Hugging Face model repository ID and the filename within it
# This should be the model repository you created on Hugging Face Hub to store model2.pkl
HF_MODEL_REPO_ID = "AR2706/read-ai-document-analysis-model" # REPLACE with your actual model repo ID
HF_MODEL_FILENAME = "model2.pkl"
# LOCAL_MODEL_CACHE_PATH = "./model2.pkl" # This variable is defined but not directly used by hf_hub_download's default behavior

try:
    # Download the model file from Hugging Face Hub
    # This will cache the file locally, so it only downloads once per container instance
    logging.info(f"Attempting to download {HF_MODEL_FILENAME} from {HF_MODEL_REPO_ID}...")
    downloaded_model_path = hf_hub_download(
        repo_id=HF_MODEL_REPO_ID,
        filename=HF_MODEL_FILENAME,
        # cache_dir=".", # Optional: specify a custom cache directory if needed
    )
    logging.info(f"Model downloaded/cached at: {downloaded_model_path}")

    # Load model.pkl from the downloaded path
    with open(downloaded_model_path, "rb") as file:
        model = pickle.load(file)

except Exception as e:
    logging.error(f"Error loading model from Hugging Face Hub or local cache: {e}")
    sys.exit(1) # Exit if model cannot be loaded

# Extract model components
summarizer = model.get("summarizer")
qg_pipeline = model.get("qg_pipeline")
qa_pipeline = model.get("qa_pipeline")

if not summarizer or not qg_pipeline or not qa_pipeline:
    raise ValueError("Error: model.pkl does not contain the necessary components (summarizer, qg_pipeline, or qa_pipeline)!")

# Function to extract and clean text from a PDF using pdfplumber
def extract_text_from_pdf(pdf_path):
    """
    Extracts and cleans text from a PDF file using pdfplumber.
    Removes non-ASCII characters and strips leading/trailing whitespace.
    """
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
        logging.error(f"Failed to extract text from PDF using pdfplumber for '{pdf_path}': {e}")
        return ""

# Function to split text into chunks
def chunk_text(text, max_tokens=512, overlap=50):
    """
    Splits the input text into smaller chunks based on word count.
    Includes an overlap to maintain context between chunks.
    """
    words = text.split()
    logging.info(f"Total words in document: {len(words)}") # Added logging
    chunks = []
    # Iterate through words, creating chunks with specified max_tokens and overlap
    for i in range(0, len(words), max_tokens - overlap):
        chunks.append(" ".join(words[i:i + max_tokens]))
    logging.info(f"Generated {len(chunks)} chunks.") # Added logging
    return chunks

# Process PDF
def process_pdf(pdf_path):
    """
    Processes a PDF file to extract text, summarize chunks,
    generate questions, and find answers within each chunk.
    """
    text = extract_text_from_pdf(pdf_path)
    if not text:
        raise ValueError("Error: PDF contains no extractable text or extraction failed.")

    text_chunks = chunk_text(text)
    results = []

    for i, chunk in enumerate(text_chunks):
        chunk_result = {}
        logging.info(f"Processing chunk {i+1}/{len(text_chunks)}")

        # Generate summary for the current chunk
        try:
            input_length = len(chunk.split())
            # Calculate max_len for summary, capping at 150 words or 70% of chunk length
            max_len = min(150, int(input_length * 0.7))

            # --- CORRECTED min_len CALCULATION (from previous turn) ---
            min_len = int(max_len * 0.2)
            if min_len < 5:
                min_len = 5
            if min_len > max_len:
                min_len = max_len
            # --- END CORRECTED min_len CALCULATION ---

            chunk_summary = summarizer(chunk, max_length=max_len, min_length=min_len, do_sample=False)[0]["summary_text"]
            chunk_result["summary"] = chunk_summary
        except Exception as e:
            logging.warning(f"Summary generation failed for chunk {i+1}: {e}")
            chunk_result["summary"] = "Summary not available."

        # Generate questions for the current chunk
        questions = []
        try:
            qg_input = f"generate questions: {chunk}"
            questions_output = qg_pipeline(qg_input)
            # Extract generated questions and remove duplicates, limit to 3
            questions = [q["generated_text"] for q in questions_output if "generated_text" in q]
            questions = list(set(questions))[:3]
        except Exception as e:
            logging.warning(f"Question generation failed for chunk {i+1}: {e}")
        chunk_result["questions"] = questions

        # Generate answers for each generated question within the chunk's context
        answers = {}
        for q in questions:
            best_answer = "No answer found"
            try:
                answer_output = qa_pipeline(question=q, context=chunk)
                best_answer = answer_output.get("answer", "No answer found")
            except Exception as e:
                logging.warning(f"Answer generation failed for question '{q}' in chunk {i+1}: {e}")
            answers[q] = best_answer
        chunk_result["answers"] = answers

        results.append(chunk_result)

    # Combine summaries from all chunks for a global summary
    full_summary = "\n\n".join([chunk["summary"] for chunk in results if chunk["summary"] != "Summary not available."])
    if not full_summary: # Fallback if all summaries failed
        full_summary = "Overall summary not available due to processing issues."

    return {
        "summary": full_summary,
        "chunks": results
    }

# Entry point for script execution
if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Provide usage instructions if PDF path is not given
        print(json.dumps({"error": "Usage: python run_model.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]

    try:
        # Process the PDF and print the JSON output
        output = process_pdf(pdf_path)
        print(json.dumps(output, indent=2)) # Use indent for pretty printing JSON
    except Exception as e:
        # Catch any unhandled exceptions during the process
        logging.error(f"Unhandled exception during PDF processing: {e}")
        print(json.dumps({"error": str(e)}))
