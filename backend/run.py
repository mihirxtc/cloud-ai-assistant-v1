import uvicorn
import os

if __name__ == "__main__":
    # Ensure terraform directory exists
    if not os.path.exists("terraform"):
        os.makedirs("terraform")
        
    print("Starting AI Cloud Infrastructure Assistant Backend...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
