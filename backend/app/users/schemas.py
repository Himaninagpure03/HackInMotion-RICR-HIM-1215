from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict

class UserOut(BaseModel):
    id: str
    email: str
    display_name : str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
