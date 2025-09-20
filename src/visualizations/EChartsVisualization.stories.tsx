import type { ComponentType, ReactElement } from 'react';
import { EChartsVisualization } from './EChartsVisualization';
import type { EChartsVisualizationProps } from './EChartsVisualization';
import { DesignSystemProvider } from '../design-system/theme';

type StoryDecorator = (StoryComponent: () => ReactElement) => ReactElement;

type StoryDefinition<TProps> = {
  args: Partial<TProps>;
};

type MetaDefinition<TProps> = {
  title: string;
  component: ComponentType<TProps>;
  decorators?: StoryDecorator[];
  parameters?: Record<string, unknown>;
};

const meta: MetaDefinition<EChartsVisualizationProps> = {
  title: 'Visualizations/Comparative Dashboard',
  component: EChartsVisualization,
  decorators: [
    (Story: () => ReactElement): ReactElement => (
      <DesignSystemProvider>
        <div style={{ padding: 'var(--ds-spacing-6)' }}>
          <Story />
        </div>
      </DesignSystemProvider>
    )
  ],
  parameters: {
    layout: 'fullscreen'
  }
};

export default meta;

type Story = StoryDefinition<EChartsVisualizationProps>;

const quarterlyData = {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    {
      name: 'Captação',
      type: 'bar' as const,
      values: [320, 280, 410, 368]
    },
    {
      name: 'Vendas',
      type: 'line' as const,
      values: [280, 340, 388, 420],
      area: true
    },
    {
      name: 'Meta',
      type: 'line' as const,
      values: [300, 300, 400, 400]
    }
  ]
};

export const ComparativeOverview: Story = {
  args: {
    title: 'Performance comercial por trimestre',
    description: 'Comparativo entre captação, vendas e metas definidas para 2024.',
    data: quarterlyData,
    height: 360,
    colorScheme: 'primary',
    valueFormatter: (value: number) => Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value * 1000)
  }
};

export const LoadingState: Story = {
  args: {
    title: 'Evolução de receita',
    description: 'Atualizando informações com base nos filtros selecionados.',
    data: { categories: [], series: [] },
    isLoading: true
  }
};

export const EmptyState: Story = {
  args: {
    title: 'Margem por região',
    description: 'Nenhum resultado encontrado para o período escolhido.',
    data: { categories: [], series: [] },
    emptyMessage: 'Ajuste filtros e tente novamente.'
  }
};

