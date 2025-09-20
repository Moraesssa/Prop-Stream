import type { Preview } from '@storybook/react';
import React from 'react';
import { DesignSystemProvider, ThemeName } from '../src/design-system';
import { lightTokens, darkTokens, tokensToCssVariables } from '../src/design-system';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'surface',
      values: [
        {
          name: 'surface',
          value: lightTokens.colors.surface
        },
        {
          name: 'surface-dark',
          value: darkTokens.colors.surface
        }
      ]
    },
    layout: 'fullscreen',
    options: {
      storySort: {
        order: ['Design System', ['Tokens', 'Button', 'Text Input', 'Data Table', 'Bar Chart']]
      }
    },
    docs: {
      theme: {
        base: 'light',
        brandTitle: 'Prop Stream Design System',
        brandUrl: 'https://storybook.js.org',
        brandTarget: '_blank',
        appContentBg: lightTokens.colors.background,
        appBg: lightTokens.colors.surface
      }
    },
    designTokens: {
      light: tokensToCssVariables(lightTokens),
      dark: tokensToCssVariables(darkTokens)
    }
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Control the active design theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Claro' },
          { value: 'dark', title: 'Escuro' }
        ]
      }
    }
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme || 'light') as ThemeName;
      return (
        <DesignSystemProvider theme={theme}>
          <Story />
        </DesignSystemProvider>
      );
    }
  ]
};

export default preview;
