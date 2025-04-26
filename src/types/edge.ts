import { Edge as ReactFlowEdge } from 'reactflow';
import { CustomAttribute } from './device';

export interface CustomEdgeData {
  color?: string;
  label?: string;
  customAttributes?: CustomAttribute[];
}

export type CustomEdge = ReactFlowEdge<CustomEdgeData>;

export const createDefaultEdgeData = (): CustomEdgeData => ({
  color: '#FF0000',
  label: '',
  customAttributes: []
}); 