export interface ComparativeMetric {
  metric: string;
  subject: number;
  benchmark: number;
}

export interface SimulationPayload {
  scenario: string;
  capital: number;
}

const mockMetrics: ComparativeMetric[] = [
  { metric: 'Cap Rate', subject: 0.082, benchmark: 0.075 },
  { metric: 'Vacância', subject: 0.05, benchmark: 0.08 }
];

export async function fetchComparativeDashboard(): Promise<ComparativeMetric[]> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  return mockMetrics;
}

export async function runScenario(payload: SimulationPayload): Promise<ComparativeMetric[]> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  return mockMetrics.map((metric) => ({
    ...metric,
    subject: metric.subject * (payload.capital / 1_000_000)
  }));
}
