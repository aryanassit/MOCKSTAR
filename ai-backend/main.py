import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 1. Professional Logging Setup (Replaces dirty print statements)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("mockstar.main")

# Load your environment variables
load_dotenv()

# Import our brand new centralized router
from routers.interview import router as interview_router

app = FastAPI(title="MOCKSTAR AI Backend", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Register the modular router paths
app.include_router(interview_router, prefix="/api/v1")

@app.get("/")
def read_root():
    logger.info("Root endpoint checked.")
    return {"message": "AI Mock Interview Backend is Live and Modular! 🚀"}

@app.get("/health")
def health_check():
    # Keep-alive route for your free-tier Render cron jobs
    return {"status": "healthy", "version": "2.0"}
