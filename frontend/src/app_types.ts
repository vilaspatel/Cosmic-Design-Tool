export type NodeType =
    // Business
    | 'Organization'
    | 'Program'
    | 'Application'
    // Logical
    | 'Service'
    | 'ExternalSystem'
    // Compute
    | 'VirtualMachine'
    | 'KubernetesCluster'
    | 'AppService'
    | 'FunctionApp'
    | 'OnPremServer'
    // Data
    | 'Database'
    | 'Cache'
    | 'Queue'
    // Cloud
    | 'CloudProvider'
    | 'Subscription'
    | 'Region'
    | 'DataCenter';

export type EdgeType =
    // Hierarchy
    | 'OWNS'                // Org -> Program
    | 'CONTAINS'            // Program -> App, Region -> Nodes, Cluster -> Data
    | 'HAS_SERVICE'         // App -> Service
    | 'HAS_SUBSCRIPTION'    // Cloud -> Sub
    | 'HAS_REGION'          // Sub -> Region
    // Logical
    | 'CALLS'               // Service -> Service
    | 'CALLS_EXTERNAL'      // Service -> External
    | 'DEPENDS_ON'          // Program -> Program
    | 'DEPENDS_ON_APP'      // App -> App
    | 'USES_EXTERNAL'       // App -> External
    | 'USES_CACHE'          // Service -> Cache
    // Persistence
    | 'READS_FROM'          // Service -> DB
    | 'WRITES_TO'           // Service -> DB
    | 'PUBLISHES_TO'        // Service -> Queue
    | 'SUBSCRIBES_TO'       // Service -> Queue
    | 'REPLICATES_TO'       // DB -> DB
    // Host / Location
    | 'RUNS_ON'             // Service -> Compute
    | 'HOSTED_IN'           // Infra -> Location (Region/DC)
    | 'LOCATED_IN'          // Server -> DC
    // Legacy (keep for now to transition)
    | 'HAS_PROGRAM'
    | 'HAS_APPLICATION'
    | 'PART_OF'
    | 'USES';

export interface NodeData {
    id: string;
    name: string;
    type: NodeType;
    parent_id?: string;
    properties: {
        program_id: string;
        application_id?: string;
        environment: 'dev' | 'stage' | 'prod' | 'none';
        is_active: boolean;
        [key: string]: any;
    };
    // Legacy fields for backward compatibility during transition
    service_identifier?: string; // Used as 'SERVICE IDENTIFIER' in UI
}

export interface EdgeData {
    source: string;
    target: string;
    type: EdgeType;
}

export interface Architecture {
    nodes: NodeData[];
    edges: EdgeData[];
}

export interface ImpactAnalysis {
    root_cause: string;
    nodes: NodeData[];
    edges: {
        from: string;
        to: string;
        type: string;
        properties: any;
    }[];
    impacted_nodes: { id: string; depth: number }[];
    summary: {
        services: number;
        applications: number;
        programs: number;
        databases: number;
        queues: number;
        external_systems: number;
        regions: number;
    };
}
