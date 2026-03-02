from pydantic import BaseModel, Field
from typing import List, Optional

class NodeModel(BaseModel):
    id: str
    name: str
    type: str 
    parent_id: Optional[str] = None
    properties: dict = Field(default_factory=lambda: {
        "program_id": "",
        "application_id": None,
        "environment": "none",
        "is_active": True
    })

class EdgeModel(BaseModel):
    from_id: str = Field(alias="from")
    to_id: str = Field(alias="to")
    type: str 
    properties: dict = Field(default_factory=dict)

    class Config:
        populate_by_name = True

class ArchitectureModel(BaseModel):
    program_id: Optional[str] = None
    nodes: List[NodeModel]
    edges: List[EdgeModel]

class ImpactRequest(BaseModel):
    service_id: str
    environment: str

class AlertModel(BaseModel):
    service: str
    severity: str
    monitor_name: str
