# Cosmic Design Engine

A production-ready PoC for graph-based service dependency and impact analysis.

## Features
- **Architecture Designer**: Visual drag-and-drop tool to define service topologies using React Flow.
- **Neo4j Backend**: Persistent graph storage with directional relationship types.
- **Impact Analysis**: Recursive traversal of dependencies to identify upstream and downstream impact.
- **Datadog Integration**: Mock webhook endpoint to trigger analysis from external alerts.

## Project Structure
- `/backend`: FastAPI application + Neo4j integration.
- `/frontend`: React + TypeScript + React Flow.
- `/infrastructure`: Dockerfiles.
- `/k8s`: Kubernetes manifests.

## Running Locally

### With Docker Compose
```bash
docker-compose up --build
```
- Frontend: http://localhost:80
- Backend: http://localhost:8000
- Neo4j Browser: http://localhost:7474 (user: neo4j, password: password)

### Manual Development
1. **Neo4j**: Run a local Neo4j instance.
2. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## API Endpoints
- `POST /architecture`: Save the current topology.
- `POST /alert`: Trigger impact analysis from a service alert.
  - **Payload Structure**:
    ```json
    {
      "service": "{{service.name}}",
      "severity": "{{alert_status}}",
      "monitor_name": "{{monitor.name}}"
    }
    ```
- `GET /impact/{service_name}`: Fetch graph traversal data for a service.

