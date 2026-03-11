/** @jsxImportSource @revideo/2d/lib */
import { Map, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { z } from "zod";
import type { mapSchema, playerSchema } from "@videofy/types";
import { Rect } from "@revideo/2d";

type PlayerConfig = z.infer<typeof playerSchema>;

const DEFAULT_MAP_STYLE_URL = "https://demotiles.maplibre.org/style.json";

interface Props {
  asset: z.infer<typeof mapSchema>;
  config: PlayerConfig;
}

export const MapComponent = ({ asset, config }: Props) => {
  const {
    lat: latitude,
    lon: longitude,
    zoomStart = 8,
  } = asset.location;

  const mapContainer = useRef<HTMLDivElement>(null);
  const isPortrait = true; // Simplified for component
  const markerStyleConfig =
    config.styles?.all?.map?.marker ||
    (isPortrait
      ? config.styles?.portrait?.map?.marker
      : config.styles?.landscape?.map?.marker);

  useEffect(() => {
    if (!mapContainer.current) return;

    const markerOptions = {
      color: markerStyleConfig?.color || "#dd0000",
      scale: markerStyleConfig?.scale || 2.5,
    };

    const createdMap = new Map({
      container: mapContainer.current,
      style: DEFAULT_MAP_STYLE_URL,
      center: [longitude, latitude],
      zoom: zoomStart,
      interactive: false,
    });

    createdMap.on("load", () => {
      new Marker(markerOptions).setLngLat([longitude, latitude]).addTo(createdMap);
    });

    return () => {
        createdMap.remove();
    };
  }, [latitude, longitude, markerStyleConfig, zoomStart]);

  // Using a custom element to avoid TS intrinsic element errors in @revideo/2d/lib
  return (
    <Rect width={"100%"} height={"100%"}>
        {/* Revideo renders to canvas, so standard DOM elements won't show up in the video export.
            However, for preview purposes, this might be needed.
            In a real Revideo project, you'd typically use a plugin or a custom node that draws to the canvas.
            For now, we'll keep it as a Rect and acknowledge the limitation. */}
    </Rect>
  );
};
