import { Node, Edge, Position } from '@xyflow/react';

const nodeWidth = 120;
const nodeHeight = 120;
const verticalGap = 160;
const horizontalGap = 160;

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  // Determine levels via topological sort/BFS
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};
  const levels: Record<string, number> = {};

  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    adjList[n.id] = [];
    levels[n.id] = 0;
  });

  edges.forEach((e) => {
    if (!adjList[e.source]) adjList[e.source] = [];
    adjList[e.source].push(e.target);
    if (inDegree[e.target] !== undefined) {
      inDegree[e.target]++;
    }
  });

  let queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);

  while (queue.length > 0) {
    const currentQueue = queue;
    queue = [];
    currentQueue.forEach((u) => {
      const nextNodes = adjList[u] || [];
      nextNodes.forEach((v) => {
        if (levels[v] < levels[u] + 1) {
          levels[v] = levels[u] + 1;
        }
        inDegree[v]--;
        if (inDegree[v] === 0) {
          queue.push(v);
        }
      });
    });
  }

  // Group by level
  const nodesByLevel: Record<number, Node[]> = {};
  nodes.forEach((node) => {
    const lvl = levels[node.id] || 0;
    if (!nodesByLevel[lvl]) nodesByLevel[lvl] = [];
    nodesByLevel[lvl].push(node);
  });

  // Assign positions
  nodes.forEach((node) => {
    const lvl = levels[node.id] || 0;
    const sameLevelNodes = nodesByLevel[lvl];
    const index = sameLevelNodes.findIndex((n) => n.id === node.id);

    // Center alignment
    const totalWidth = (sameLevelNodes.length - 1) * horizontalGap;
    const startX = -totalWidth / 2;

    node.targetPosition = direction === 'TB' ? Position.Top : Position.Left;
    node.sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right;

    if (direction === 'TB') {
      node.position = {
        x: startX + index * horizontalGap - nodeWidth / 2,
        y: lvl * verticalGap,
      };
    } else {
      node.position = {
        x: lvl * verticalGap,
        y: startX + index * horizontalGap - nodeHeight / 2,
      };
    }
  });

  return { nodes, edges };
};
