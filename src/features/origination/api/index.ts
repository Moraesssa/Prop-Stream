export interface Opportunity {
  id: string;
  propertyName: string;
  stage: 'prospect' | 'analysis' | 'offer' | 'negotiation';
  expectedReturn: number;
}

export interface ProposalPayload {
  opportunityId: string;
  offerValue: number;
}

const mockPipeline: Opportunity[] = [
  {
    id: 'op-001',
    propertyName: 'Residencial Aurora',
    stage: 'analysis',
    expectedReturn: 0.18
  },
  {
    id: 'op-002',
    propertyName: 'Complexo Horizonte',
    stage: 'offer',
    expectedReturn: 0.22
  }
];

export async function fetchPipeline(): Promise<Opportunity[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockPipeline;
}

export async function submitProposal(payload: ProposalPayload): Promise<Opportunity> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const updated: Opportunity = {
    id: payload.opportunityId,
    propertyName: mockPipeline[0]?.propertyName ?? 'Nova oportunidade',
    stage: 'negotiation',
    expectedReturn: mockPipeline[0]?.expectedReturn ?? 0.18
  };
  return updated;
}
