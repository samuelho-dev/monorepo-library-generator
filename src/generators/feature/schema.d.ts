export interface FeatureGeneratorSchema {
  name: string;
  directory?: string;
  description?: string;
  scope?: string;
  platform?: 'node' | 'universal' | 'browser' | 'edge';
  includeClientServer?: boolean;
  includeRPC?: boolean;
  includeCQRS?: boolean;
  includeEdge?: boolean;
  testRunner?: 'vitest';
  tags?: string;
}
