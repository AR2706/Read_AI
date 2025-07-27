from huggingface_hub import HfApi, login
import os

# Ensure you are logged in (or run huggingface-cli login beforehand)
# login() # Uncomment if you haven't logged in via CLI

api = HfApi()

# Define your local model path and target repo ID
local_model_path = "D:/Read_AI/backend/model2.pkl" # Adjust if your path is different
repo_id = "AR2706/read-ai-document-analysis-model" # Replace with your actual model repo name

print(f"Uploading {local_model_path} to {repo_id}...")

api.upload_file(
    path_or_fileobj=local_model_path,
    path_in_repo="model2.pkl", # Name of the file in the HF repo
    repo_id=repo_id,
    repo_type="model",
)

print("Model uploaded successfully!")