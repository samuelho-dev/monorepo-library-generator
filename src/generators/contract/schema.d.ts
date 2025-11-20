export interface ContractGeneratorSchema {
  name: string;
  directory?: string;
  description?: string;
  dependencies?: string[];
  includeCQRS?: boolean;
  includeRPC?: boolean;
  tags?: string;
}
