import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { VisualizationContainer } from './VisualizationContainer';
import type { VisualizationBaseProps } from './VisualizationContainer';
import { ensureColorPalette, getSchemePalette, type VisualizationColorScheme } from './color-utils';
import { useDesignSystem } from '../design-system/theme';

type MapInstance = {
  addControl: (...args: unknown[]) => void;
  remove: () => void;
  once: (event: string, callback: () => void) => void;
  easeTo: (options: Record<string, unknown>) => void;
  fitBounds: (bounds: unknown, options: Record<string, unknown>) => void;
  getZoom: () => number;
};

type MarkerInstance = {
  setLngLat: (value: unknown) => MarkerInstance;
  addTo: (map: MapInstance) => MarkerInstance;
  setPopup: (popup: PopupInstance) => MarkerInstance;
  getElement: () => HTMLElement;
  remove: () => void;
};

type PopupInstance = {
  setHTML: (value: string) => PopupInstance;
};

type MapboxModule = {
  Map: new (options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MarkerInstance;
  Popup: new (options: Record<string, unknown>) => PopupInstance;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
  LngLatBounds: new (sw: unknown, ne: unknown) => { extend: (value: unknown) => void };
  accessToken: string;
  default?: MapboxModule;
};

type LngLatLike = unknown;
type LngLatBoundsLike = unknown;

export type PortfolioMarker = {
  id: string;
  coordinates: [number, number];
  title: string;
  subtitle?: string;
  value?: string;
  color?: string;
};

export type PortfolioMapProps = VisualizationBaseProps & {
  accessToken?: string;
  center?: [number, number];
  zoom?: number;
  markers?: PortfolioMarker[];
  mapStyle?: string;
  fitBounds?: boolean;
  colorScheme?: VisualizationColorScheme;
  colors?: string[];
  onMarkerClick?: (marker: PortfolioMarker) => void;
};

type InternalMarker = {
  marker: MarkerInstance;
  cleanup?: () => void;
};

const DEFAULT_CENTER: [number, number] = [-47.8825, -15.7942];

const cssAlreadyLoaded = () =>
  typeof document !== 'undefined' && Boolean(document.querySelector('link[data-mapbox-gl="true"]'));

const loadMapboxCss = () => {
  if (typeof document === 'undefined' || cssAlreadyLoaded()) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css';
  link.dataset.mapboxGl = 'true';
  document.head.appendChild(link);
};

const formatPopupContent = (marker: PortfolioMarker, tokens: ReturnType<typeof useDesignSystem>['tokens']): string => {
  const { title, subtitle, value } = marker;
  const subtitleSection = subtitle ? `<div style="color:${tokens.colors.textMuted};font-size:${tokens.typography.fontSize.xs};margin-top:4px;">${subtitle}</div>` : '';
  const valueSection = value
    ? `<strong style="display:block;margin-top:6px;font-size:${tokens.typography.fontSize.sm};color:${tokens.colors.text};">${value}</strong>`
    : '';
  return `
    <div style="min-width:180px;font-family:${tokens.typography.fontFamily.sans};color:${tokens.colors.text};">
      <span style="font-size:${tokens.typography.fontSize.sm};font-weight:${tokens.typography.fontWeight.semibold};">${title}</span>
      ${subtitleSection}
      ${valueSection}
    </div>
  `;
};

export const PortfolioMap: React.FC<PortfolioMapProps> = ({
  title,
  description,
  actions,
  accessToken,
  center,
  zoom,
  markers = [],
  mapStyle,
  fitBounds = true,
  colorScheme = 'primary',
  colors,
  onMarkerClick,
  isLoading,
  error,
  emptyMessage = 'Nenhum ativo do portfólio foi localizado para os filtros informados.',
  height = 420,
  className,
  style
}) => {
  const designSystem = useDesignSystem();
  const { tokens, theme } = designSystem;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markersRef = useRef<InternalMarker[]>([]);
  const mapboxModuleRef = useRef<MapboxModule | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<ReactNode | null>(null);

  const palette = useMemo(() => {
    const fallback = getSchemePalette(tokens, colorScheme, tokens.colors.primary?.foreground ?? tokens.colors.text);
    return ensureColorPalette(colors, fallback);
  }, [tokens, colorScheme, colors]);

  const resolvedStyle = useMemo(() => {
    if (mapStyle) {
      return mapStyle;
    }
    return theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
  }, [mapStyle, theme]);

  useEffect(() => {
    loadMapboxCss();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === 'undefined') {
      return;
    }

    if (!accessToken) {
      setLoadError('Informe um token do Mapbox para visualizar o mapa.');
      markersRef.current.forEach((item) => {
        item.cleanup?.();
        item.marker.remove();
      });
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxModuleRef.current = null;
      return;
    }

    let isMounted = true;
    setMapReady(false);

    const initialize = async () => {
      try {
        const module = (await import(/* @vite-ignore */ 'mapbox-gl')) as MapboxModule;
        const mapbox = module?.default ?? module;

        if (!isMounted || !mapContainerRef.current) {
          return;
        }

        mapbox.accessToken = accessToken;
        mapboxModuleRef.current = mapbox;

        const instance = new mapbox.Map({
          container: mapContainerRef.current,
          style: resolvedStyle,
          center: (center as LngLatLike) ?? DEFAULT_CENTER,
          zoom: zoom ?? 3,
          attributionControl: true
        });

        instance.addControl(new mapbox.NavigationControl({ visualizePitch: true }), 'top-right');

        mapRef.current = instance;
        setLoadError(null);

        const handleLoad = () => {
          setMapReady(true);
        };

        instance.once('load', handleLoad);
      } catch (err) {
        console.error('Mapbox GL not available', err);
        if (isMounted) {
          setLoadError('Não foi possível carregar o mapa interativo.');
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      markersRef.current.forEach((item) => {
        item.cleanup?.();
        item.marker.remove();
      });
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxModuleRef.current = null;
    };
  }, [accessToken, center, zoom, resolvedStyle]);

  useEffect(() => {
    const map = mapRef.current;
    const mapbox = mapboxModuleRef.current;
    if (!map || !mapReady || !mapbox) {
      return;
    }

    markersRef.current.forEach((item) => {
      item.cleanup?.();
      item.marker.remove();
    });
    markersRef.current = [];

    if (!markers.length) {
      return;
    }

    const defaultColor = palette[0] ?? tokens.colors.primary?.[500] ?? '#2563eb';

    const nextMarkers: InternalMarker[] = markers.map((marker) => {
      const markerColor = marker.color ?? defaultColor;
      const instance = new mapbox.Marker({ color: markerColor });
      instance.setLngLat(marker.coordinates as LngLatLike).addTo(map);

      let popup: PopupInstance | undefined;
      if (marker.subtitle || marker.value) {
        popup = new mapbox.Popup({ offset: 12 }).setHTML(formatPopupContent(marker, tokens));
        instance.setPopup(popup);
      }

      let cleanup: (() => void) | undefined;
      if (onMarkerClick) {
        const element = instance.getElement();
        const handleClick = () => onMarkerClick(marker);
        element.addEventListener('click', handleClick);
        cleanup = () => {
          element.removeEventListener('click', handleClick);
        };
      }

      return { marker: instance, cleanup };
    });

    markersRef.current = nextMarkers;

    if (!fitBounds) {
      return;
    }

    if (markers.length === 1) {
      map.easeTo({ center: markers[0].coordinates as LngLatLike, duration: 600, zoom: Math.max(zoom ?? map.getZoom(), 10) });
      return;
    }

    const bounds = new mapbox.LngLatBounds(markers[0].coordinates as LngLatLike, markers[0].coordinates as LngLatLike);
    markers.slice(1).forEach((marker) => {
      bounds.extend(marker.coordinates as LngLatLike);
    });
    map.fitBounds(bounds as LngLatBoundsLike, { padding: 48, duration: 700, maxZoom: 14 });
  }, [markers, mapReady, onMarkerClick, palette, fitBounds, tokens, zoom]);

  const combinedError = error ?? loadError;
  const isEmpty = markers.length === 0;
  const shouldShowLoading = Boolean(isLoading) || (!combinedError && !isEmpty && !mapReady);

  return (
    <VisualizationContainer
      title={title}
      description={description}
      actions={actions}
      isLoading={shouldShowLoading}
      error={combinedError}
      emptyMessage={emptyMessage}
      isEmpty={isEmpty && !combinedError && !shouldShowLoading}
      height={height}
      className={className}
      style={style}
    >
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: tokens.radius.md,
          overflow: 'hidden',
          boxShadow: tokens.shadow.sm,
          backgroundColor: tokens.colors.surfaceMuted
        }}
      />
    </VisualizationContainer>
  );
};

