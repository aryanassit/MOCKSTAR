from pydantic import BaseModel

class ResumeRequest(BaseModel):
    resume_url: str

class VideoRequest(BaseModel):
    video_url: str
    question: str