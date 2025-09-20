import type { ComponentType, ReactElement } from 'react';
import { PortfolioMap } from './PortfolioMap';
import type { PortfolioMapProps } from './PortfolioMap';
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

const meta: MetaDefinition<PortfolioMapProps> = {
  title: 'Visualizations/Portfolio Map',
  component: PortfolioMap,
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

type Story = StoryDefinition<PortfolioMapProps>;

const demoMarkers: PortfolioMapProps['markers'] = [
  {
    id: 'sp',
    title: 'São Paulo',
    subtitle: '16 imóveis em carteira',
    value: 'Taxa de ocupação 92%',
    coordinates: [-46.633309, -23.55052]
  },
  {
    id: 'rio',
    title: 'Rio de Janeiro',
    subtitle: '11 imóveis',
    value: 'Cap rate médio de 8,2%',
    coordinates: [-43.172897, -22.906847]
  },
  {
    id: 'bh',
    title: 'Belo Horizonte',
    subtitle: '7 imóveis',
    value: 'Vacância 5%',
    coordinates: [-43.93778, -19.92083]
  }
];

export const PortfolioOverview: Story = {
  args: {
    title: 'Mapa de portfólio imobiliário',
    description: 'Distribuição geográfica dos ativos e principais indicadores por praça.',
    accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.lX4LPm6vZjuZkJELrI6dgQ',
    markers: demoMarkers,
    height: 420,
    fitBounds: true
  }
};

export const LoadingPortfolio: Story = {
  args: {
    title: 'Carregando mapa do portfólio',
    accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.lX4LPm6vZjuZkJELrI6dgQ',
    markers: demoMarkers,
    isLoading: true
  }
};

export const EmptyPortfolio: Story = {
  args: {
    title: 'Nenhum ativo encontrado',
    accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.lX4LPm6vZjuZkJELrI6dgQ',
    markers: [],
    emptyMessage: 'Aplique filtros diferentes para explorar novas regiões.'
  }
};

