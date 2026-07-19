from pydantic import BaseModel
from typing import Literal

class ResumeRequest(BaseModel):
    resume_url: str
    round_type: Literal["technical", "hr"] = "technical"

class VideoRequest(BaseModel):
    video_url: str
    question: str
