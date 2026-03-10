import type { NodeType, EdgeType } from './app_types';

export interface TopologyRule {
    source: NodeType;
    target: NodeType;
    allowedEdges: EdgeType[];
}

export const TOPOLOGY_RULES: TopologyRule[] = [
    // Organization -> Program
    { source: 'Organization', target: 'Program', allowedEdges: ['OWNS'] },

    // Program -> App, Program -> Program
    { source: 'Program', target: 'Application', allowedEdges: ['CONTAINS'] },
    { source: 'Program', target: 'Program', allowedEdges: ['DEPENDS_ON'] },

    // Application -> Service, Application -> External, Application -> Application
    { source: 'Application', target: 'Service', allowedEdges: ['HAS_SERVICE'] },
    { source: 'Application', target: 'ExternalSystem', allowedEdges: ['USES_EXTERNAL'] },
    { source: 'Application', target: 'Application', allowedEdges: ['DEPENDS_ON_APP'] },

    // Service -> Service, Service -> External, Service -> Database, Service -> Cache, Service -> Queue
    { source: 'Service', target: 'Service', allowedEdges: ['CALLS'] },
    { source: 'Service', target: 'ExternalSystem', allowedEdges: ['CALLS_EXTERNAL'] },
    { source: 'Service', target: 'Database', allowedEdges: ['READS_FROM', 'WRITES_TO'] },
    { source: 'Service', target: 'Cache', allowedEdges: ['USES_CACHE'] },
    { source: 'Service', target: 'Queue', allowedEdges: ['PUBLISHES_TO', 'SUBSCRIBES_TO'] },

    // ExternalSystem -> Data (Extension Rules)
    { source: 'ExternalSystem', target: 'Database', allowedEdges: ['READS_FROM', 'WRITES_TO'] },
    { source: 'ExternalSystem', target: 'Cache', allowedEdges: ['USES_CACHE'] },
    { source: 'ExternalSystem', target: 'Queue', allowedEdges: ['PUBLISHES_TO', 'SUBSCRIBES_TO'] },

    // Compute -> Data (Extension Rules)
    ...['VirtualMachine', 'KubernetesCluster', 'AppService', 'FunctionApp', 'OnPremServer'].flatMap((src): TopologyRule[] => [
        { source: src as NodeType, target: 'Database', allowedEdges: ['READS_FROM', 'WRITES_TO'] },
        { source: src as NodeType, target: 'Cache', allowedEdges: ['USES_CACHE'] },
        { source: src as NodeType, target: 'Queue', allowedEdges: ['PUBLISHES_TO', 'SUBSCRIBES_TO'] }
    ]),

    // Service -> Compute (Multi-type)
    ...['VirtualMachine', 'KubernetesCluster', 'AppService', 'FunctionApp', 'OnPremServer'].map((t): TopologyRule => ({
        source: 'Service', target: t as NodeType, allowedEdges: ['RUNS_ON']
    })),

    // External System -> Hosting
    { source: 'ExternalSystem', target: 'CloudProvider', allowedEdges: ['HOSTED_IN'] },
    { source: 'ExternalSystem', target: 'DataCenter', allowedEdges: ['HOSTED_IN'] },

    // Compute -> Hosting
    { source: 'VirtualMachine', target: 'Region', allowedEdges: ['HOSTED_IN'] },
    { source: 'VirtualMachine', target: 'DataCenter', allowedEdges: ['HOSTED_IN'] },
    { source: 'AppService', target: 'Region', allowedEdges: ['HOSTED_IN'] },
    { source: 'FunctionApp', target: 'Region', allowedEdges: ['HOSTED_IN'] },
    { source: 'KubernetesCluster', target: 'Region', allowedEdges: ['HOSTED_IN'] },
    { source: 'OnPremServer', target: 'DataCenter', allowedEdges: ['LOCATED_IN'] },

    // Data -> Hosting / Replications
    { source: 'Database', target: 'Region', allowedEdges: ['HOSTED_IN'] },
    { source: 'Database', target: 'DataCenter', allowedEdges: ['HOSTED_IN'] },
    { source: 'Database', target: 'Database', allowedEdges: ['REPLICATES_TO'] },
    { source: 'Cache', target: 'Region', allowedEdges: ['HOSTED_IN'] },
    { source: 'Cache', target: 'DataCenter', allowedEdges: ['HOSTED_IN'] },
    { source: 'Queue', target: 'Region', allowedEdges: ['HOSTED_IN'] },
    { source: 'Queue', target: 'DataCenter', allowedEdges: ['HOSTED_IN'] },

    // Cloud Hierarchy
    { source: 'CloudProvider', target: 'Subscription', allowedEdges: ['HAS_SUBSCRIPTION'] },
    { source: 'Subscription', target: 'Region', allowedEdges: ['HAS_REGION'] },

    // Region -> Compute + Data
    ...['VirtualMachine', 'KubernetesCluster', 'AppService', 'FunctionApp', 'Database', 'Cache', 'Queue'].map((t): TopologyRule => ({
        source: 'Region', target: t as NodeType, allowedEdges: ['CONTAINS']
    })),

    // DataCenter -> OnPrem Compute + Data + External
    ...['OnPremServer', 'Database', 'Cache', 'Queue', 'ExternalSystem'].map((t): TopologyRule => ({
        source: 'DataCenter', target: t as NodeType, allowedEdges: ['CONTAINS']
    }))
];

/**
 * Helper to get allowed relationship types between two node types
 */
export const getRulesForConnection = (src: NodeType, tgt: NodeType): EdgeType[] => {
    const rule = TOPOLOGY_RULES.find(r => r.source === src && r.target === tgt);
    return rule ? rule.allowedEdges : [];
};
