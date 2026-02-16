/**
 * Graph Generator for workflow visualization
 */

import * as d3 from 'd3';

export interface GraphNode {
  id: string;
  label: string;
  type: 'agent' | 'start' | 'end';
  latency?: number;
  cost?: number;
  isBottleneck?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Generate graph data from workflow
 */
export function generateGraphData(workflow: {
  id: string;
  steps: Array<{
    id: string;
    agentId: string;
    agentName: string;
    dependencies: string[];
    inputTokens?: number;
    outputTokens?: number;
  }>;
  stepAnalysis?: Array<{
    stepId: string;
    latency: number;
    cost: number;
    isBottleneck: boolean;
  }>;
}): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  const stepAnalysisMap = new Map(
    (workflow.stepAnalysis || []).map(s => [s.stepId, s])
  );

  // Add start node
  nodes.push({
    id: 'start',
    label: 'Start',
    type: 'start',
  });

  // Add agent nodes
  for (const step of workflow.steps) {
    const analysis = stepAnalysisMap.get(step.id);
    
    nodes.push({
      id: step.id,
      label: step.agentName,
      type: 'agent',
      latency: analysis?.latency,
      cost: analysis?.cost,
      isBottleneck: analysis?.isBottleneck,
    });
  }

  // Add end node
  nodes.push({
    id: 'end',
    label: 'End',
    type: 'end',
  });

  // Create edges based on dependencies
  const dependentSteps = new Set<string>();
  for (const step of workflow.steps) {
    for (const dep of step.dependencies) {
      dependentSteps.add(step.id);
    }
  }

  // Connect start to root nodes (no dependencies)
  for (const step of workflow.steps) {
    if (step.dependencies.length === 0) {
      edges.push({
        source: 'start',
        target: step.id,
      });
    }
  }

  // Connect dependencies
  for (const step of workflow.steps) {
    for (const dep of step.dependencies) {
      edges.push({
        source: dep,
        target: step.id,
      });
    }
  }

  // Connect leaf nodes (no dependents) to end
  for (const step of workflow.steps) {
    if (!dependentSteps.has(step.id)) {
      edges.push({
        source: step.id,
        target: 'end',
      });
    }
  }

  return { nodes, edges };
}

/**
 * Generate SVG visualization
 */
export function generateSVG(data: GraphData, width: number = 800, height: number = 600): string {
  const svg = d3.select('svg');
  
  // Create force simulation
  const simulation = d3.forceSimulation(data.nodes as any)
    .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2));

  // Create SVG string
  let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svgContent += `<style>
    .node-agent { fill: #4a90d9; }
    .node-start { fill: #27ae60; }
    .node-end { fill: #e74c3c; }
    .node-bottleneck { fill: #f39c12; }
    .edge { stroke: #999; stroke-width: 2; }
    .label { font-family: Arial; font-size: 12px; }
  </style>`;

  // Add edges
  for (const edge of data.edges) {
    svgContent += `<line class="edge" x1="0" y1="0" x2="0" y2="0" data-source="${edge.source}" data-target="${edge.target}"/>`;
  }

  // Add nodes
  for (const node of data.nodes) {
    let className = `node-${node.type}`;
    if (node.isBottleneck) className = 'node-bottleneck';
    svgContent += `<circle class="${className}" r="20" cx="0" cy="0" data-id="${node.id}"/>`;
    svgContent += `<text class="label" x="0" y="35" text-anchor="middle">${node.label}</text>`;
  }

  svgContent += '</svg>';
  
  return svgContent;
}

/**
 * Generate DOT language for Graphviz
 */
export function generateDot(data: GraphData): string {
  let dot = 'digraph workflow {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [shape=box, style=rounded];\n';

  // Define nodes
  for (const node of data.nodes) {
    let attrs = `label="${node.label}"`;
    
    if (node.type === 'start') {
      attrs += ', shape=circle, style=filled, fillcolor=green';
    } else if (node.type === 'end') {
      attrs += ', shape=circle, style=filled, fillcolor=red';
    } else if (node.isBottleneck) {
      attrs += ', style=filled, fillcolor=orange';
    }
    
    dot += `  "${node.id}" [${attrs}];\n`;
  }

  // Define edges
  for (const edge of data.edges) {
    dot += `  "${edge.source}" -> "${edge.target}";\n`;
  }

  dot += '}\n';
  
  return dot;
}
