from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from models import ArchitectureModel, AlertModel
from services.graph_service import graph_service
from services.architecture_service import ArchitectureService
from services.alert_service import AlertService

app = FastAPI(title="Cosmic Design Engine - Refactored")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency Injection helpers
def get_architecture_service():
    return ArchitectureService(graph_service)

def get_alert_service():
    return AlertService(graph_service)

@app.post("/publish")
async def publish_architecture(
    arch: ArchitectureModel, 
    service: ArchitectureService = Depends(get_architecture_service)
):
    try:
        service.save_architecture(arch)
        return {"status": "success", "message": "Architecture published and deactivated previous versions"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/impact")
async def get_service_impact(
    req: ImpactRequest, 
    service: AlertService = Depends(get_alert_service)
):
    try:
        impact = service.get_impact_analysis(req.service_id, req.environment)
        return impact
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/programs")
async def get_programs(service: ArchitectureService = Depends(get_architecture_service)):
    return service.get_nodes_by_type("Program")

@app.get("/applications")
async def get_applications(program_id: str, service: ArchitectureService = Depends(get_architecture_service)):
    return service.get_nodes_by_parent(program_id, "Application")

@app.get("/services")
async def get_services(program_id: str = None, service: ArchitectureService = Depends(get_architecture_service)):
    if program_id:
        return service.get_nodes_by_parent(program_id, "Service")
    return service.get_nodes_by_type("Service")

@app.post("/alert")
async def process_alert(
    alert: AlertModel, 
    service: AlertService = Depends(get_alert_service)
):
    try:
        # Backward compatibility for existing alert triggers
        impact = service.get_impact_analysis(alert.service)
        return {
            "alert": alert,
            "impact": impact
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
