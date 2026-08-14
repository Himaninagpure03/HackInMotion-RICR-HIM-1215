from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., max_length=20)
    institution: str | None = Field(default=None, max_length=100)
    last_four_digits: str | None = Field(
        default=None,
        min_length=4,
        max_length=4,
    )


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    type: str | None = Field(default=None, max_length=20)
    institution: str | None = Field(default=None, max_length=100)
    last_four_digits: str | None = Field(default=None, min_length=4, max_length=4)


class AccountResponse(BaseModel):
    id: int
    user_id: str
    name: str
    type: str
    institution: str | None
    last_four_digits: str | None

    class Config:
        from_attributes = True
