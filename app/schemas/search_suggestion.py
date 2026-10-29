from pydantic import BaseModel


class Suggestion(BaseModel):
    id: int
    name: str
    type: str


class SuggestionResponse(BaseModel):
    query: str
    suggestions: list[Suggestion]

    class Config:
        from_attributes = True