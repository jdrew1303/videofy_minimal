/** @jsxImportSource react */
import { Player as RevideoPlayer } from "@revideo/player-react";
import { useMemo } from "react";
import type { z } from "zod";
import {
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  defaultPlayerConfig,
} from "./types/constants";
import type { processedManuscriptSchema } from "@videofy/types";
import { playerSchema } from "@videofy/types";
import project from "./project";

type PlayerConfig = z.infer<typeof playerSchema>;

export interface PlayerProps {
  manuscripts: Array<z.infer<typeof processedManuscriptSchema>>;
  width?: number;
  height?: number;
  voice?: boolean;
  style?: React.CSSProperties;
  playerConfig?: PlayerConfig;
  onPlayerReady?: (player: any) => void;
}

export const Player = (
    {
      manuscripts,
      height = VIDEO_HEIGHT,
      width = VIDEO_WIDTH,
      voice = true,
      playerConfig = defaultPlayerConfig,
      onPlayerReady,
    }: PlayerProps
  ) => {
    const variables = useMemo(
      () => ({
        manuscripts,
        voice,
        playerConfig,
        width,
        height,
      }),
      [manuscripts, voice, playerConfig, width, height]
    );

    return (
      <RevideoPlayer
        project={project}
        variables={variables}
        width={width}
        height={height}
        fps={VIDEO_FPS}
        controls
        onPlayerReady={onPlayerReady}
      />
    );
  };

Player.displayName = "Player";
