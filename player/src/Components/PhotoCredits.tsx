/** @jsxImportSource @revideo/2d/lib */
import { playerSchema } from "@videofy/types";
import type { z } from "zod";
import { useScene } from "@revideo/core";
import { Rect, Txt, Img } from "@revideo/2d";

type PlayerConfig = z.infer<typeof playerSchema>;

interface Props {
  byline: string;
  config: PlayerConfig;
}

const PhotoCredits = ({ byline, config }: Props) => {
  const width = useScene().variables.get("width", 1080)();
  const height = useScene().variables.get("height", 1920)();
  const isPortrait = height > width;

  const color = config.colors?.fotoCredits?.text || "white";
  const iconColor = config.colors?.fotoCredits?.icon || "white";

  return (
    <Rect
      layout
      direction={"row"}
      alignItems={"center"}
      gap={4}
      position={[width / 2 - 100, 380]}
      rotation={90}
    >
      <Rect width={24} height={24} fill={iconColor} />
      <Txt
        text={byline}
        fill={color}
        fontSize={26}
        fontFamily={"Inter"}
      />
    </Rect>
  );
};

export default PhotoCredits;
