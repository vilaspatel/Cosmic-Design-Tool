# Cosmic Design Engine - Architecture Designer Rules

This document outlines the rules and conventions for using the Architecture Designer to model service topologies and dependencies.

## 1. Node Categories and Types

Nodes are categorized by their logical groupings. When designing your architecture, you must use the appropriate node type from the corresponding category:

### Business
*   **Organization**: Represents a high-level business entity.
*   **Program**: A logical group of related applications or initiatives.
*   **Application**: A cohesive software application providing a specific set of features.

### Logical
*   **Service**: A functional microservice or backend component.

### External
*   **ExternalSystem**: An external third-party API or service outside your direct control. Can be placed freely on the canvas without a parent node constraint.

### Compute
*   **VirtualMachine**: A standard VM host.
*   **KubernetesCluster**: A managed Kubernetes environment.
*   **AppService**: A managed PaaS application host.
*   **FunctionApp**: A serverless function deployment.
*   **OnPremServer**: Physical or legacy on-premises hardware.

### Data
*   **Database**: Persistent datastore (relational, NoSQL, etc.).
*   **Cache**: In-memory ephemeral storage (e.g., Redis).
*   **Queue**: Message broker or event stream (e.g., Kafka, RabbitMQ).

### Cloud
*   **CloudProvider**: AWS, Azure, GCP, etc.
*   **Subscription**: A logical billing or isolation boundary within a cloud provider.
*   **Region**: A geographic location (e.g., `us-east-1`).
*   **DataCenter**: A physical facility location.

---

## 2. Relationships (Edges) and Allowed Logic

Relationships between nodes define the graph topology. The designer supports different **Edge Types** depending on the source and target nodes.

### Hierarchical Relationships (Containment)
These relationships imply a parent-child structure. When a hierarchical edge is created, the child node's `parent_id` is automatically updated to reflect its parent in the nested structures. If this edge is removed, the `parent_id` is cleared.

*   `OWNS`: Organization $\rightarrow$ Program
*   `CONTAINS`: Program $\rightarrow$ Application, Region $\rightarrow$ Compute Nodes, KubernetesCluster $\rightarrow$ Data Services
*   `HAS_SERVICE`: Application $\rightarrow$ Service
*   `HAS_SUBSCRIPTION`: CloudProvider $\rightarrow$ Subscription
*   `HAS_REGION`: Subscription $\rightarrow$ Region

### Logical & Execution Flow
These define how systems interact and rely on each other during runtime.

*   `CALLS`: Service $\rightarrow$ Service (Direct synchronous or internal API call)
*   `CALLS_EXTERNAL`: Service $\rightarrow$ ExternalSystem
*   `DEPENDS_ON`: Program $\rightarrow$ Program
*   `DEPENDS_ON_APP`: Application $\rightarrow$ Application
*   `USES_EXTERNAL`: Application $\rightarrow$ ExternalSystem
*   `USES_CACHE`: Service $\rightarrow$ Cache

### Data Persistence & Communication
These define interactions with stateful backends or event-driven systems.

*   `READS_FROM`: Service / ExternalSystem / Compute $\rightarrow$ Database
*   `WRITES_TO`: Service / ExternalSystem / Compute $\rightarrow$ Database
*   `PUBLISHES_TO`: Service / ExternalSystem / Compute $\rightarrow$ Queue
*   `SUBSCRIBES_TO`: Service / ExternalSystem / Compute $\rightarrow$ Queue
*   `USES_CACHE`: Service / ExternalSystem / Compute $\rightarrow$ Cache
*   `REPLICATES_TO`: Database $\rightarrow$ Database

### Hosting & Location
These define where logical services are physically deployed or executed.

*   `RUNS_ON`: Service $\rightarrow$ Compute (VM, Cluster, FunctionApp)
*   `HOSTED_IN`: Infrastructure (Compute/Data) $\rightarrow$ Location (Region/DataCenter)
*   `LOCATED_IN`: OnPremServer $\rightarrow$ DataCenter

---

## 3. Advanced Designer Features

### Multi-Edge Logic
The designer supports **multiple semantic relationships** between the exact same pair of source and target nodes. 
*   **Example**: A Service might both `READS_FROM` and `WRITES_TO` the same Database.
*   The system will visually differentiate these edges to prevent overlapping, showing distinct lines representing each allowed relationship type.
*   You can toggle or change the edge type of existing connections safely without interfering with other parallel connections.

### Edge Properties Panel
Clicking on any connection (edge) on the canvas opens the **Connection Properties** sidebar. From this panel, you can:
*   View the associated Source and Target nodes.
*   Change the Source or Target node. The dropdowns only show valid nodes based on topology rules. If a node change makes the current connection type invalid, the system automatically selects a default valid connection type.
*   Change the connection type. The dropdown shows all strictly valid topology rules for the current Source and Target nodes, excluding types that already exist between them.
*   Safely delete the connection. This uses a right-click context menu mechanism under the hood.

### Auto Arrange
The **Auto Arrange** button in the canvas toolbar uses a directed graph layout algorithm (Dagre) to automatically align and structure all nodes and relationships on the canvas hierarchically (top-down). This cleans up messy manual placements and automatically fits the neatly organized graph to your view.

### Node Properties & Metadata
All nodes must be configured with relevant property metadata upon creation.
*   **Required base properties**: A unique string `id`, a descriptive `name`, and its `type`.
*   **Application context**: `program_id` (mandatory for applicable types), `application_id` (optional).
*   **Environment**: Must be one of `dev`, `stage`, `prod`, or `none`.
*   **Status**: `is_active` boolean to flag current operational status.
*   **Integration**: Certain logical nodes (like Service) map to `service_identifier` for resolving external alert hooks to trigger impact analysis.

## 4. Graph Verification & Impact
When modeling your topology, ensure relationships flow directionally. The backend uses these directional graph connections to perform recursive dependency traversal. Correct edge choices will enable accurate upstream and downstream **Impact Analysis** whenever a component experiences an alert.
