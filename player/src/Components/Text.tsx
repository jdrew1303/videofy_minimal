/** @jsxImportSource @revideo/2d/lib */
import { useScene } from "@revideo/core";
import { playerSchema } from "@videofy/types";
import type { z } from "zod";
import { Rect, Txt } from "@revideo/2d";

type PlayerConfig = z.infer<typeof playerSchema>;

interface Props {
  titleText: string;
  placement?: "top" | "middle" | "bottom";
  config: PlayerConfig;
}

export const Text = ({
  titleText,
  placement = "bottom",
  config,
}: Props) => {
  const width = useScene().variables.get("width", 1080)();
  const height = useScene().variables.get("height", 1920)();
  const isPortrait = height > width;

  let yOffset = 0;
  switch (placement) {
    case "top": yOffset = -height/3; break;
    case "middle": yOffset = 0; break;
    case "bottom": yOffset = height/3; break;
  }

  return (
    <Rect
      fill={config.colors?.text.background || "black"}
      padding={20}
      radius={8}
      y={yOffset}
    >
      <Txt
        text={titleText}
        fill={config.colors?.text.text || "white"}
        fontSize={isPortrait ? 48 : 64}
        fontFamily={"Inter"}
        textAlign={"center"}
      />
    </Rect>
  );
};
