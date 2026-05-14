from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Visit(BaseModel):
    id: str
    ip: str
    city: Optional[str] = "Unknown"
    region: Optional[str] = "Unknown"
    country: Optional[str] = "Unknown"
    isp: Optional[str] = "Unknown"
    browser: Optional[str] = "Unknown"
    os: Optional[str] = "Unknown"
    path: str
    timestamp: datetime
