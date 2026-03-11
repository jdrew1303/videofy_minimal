/** @jsxImportSource @revideo/2d/lib */
import { useScene } from "@revideo/core";
import { playerSchema } from "@videofy/types";
import type { z } from "zod";
import { Rect, Txt } from "@revideo/2d";

type PlayerConfig = z.infer<typeof playerSchema>;

interface Props {
  current: number;
  length: number;
  config: PlayerConfig;
}

const ArticleProgress = ({ current, length, config }: Props) => {
  const width = useScene().variables.get("width", 1080)();
  const height = useScene().variables.get("height", 1920)();
  const isPortrait = height > width;

  if (length <= 1) {
    return null;
  }

  return (
    <Rect
      position={[-width / 2 + 110, isPortrait ? 0 : -200]} // rough center offset
      layout
      direction={"column"}
      gap={6}
    >
      {Array.from({ length }, (_, index) => {
        const key = `indicator-${current}-${index}`;
        return (
          <Rect
            key={key}
            width={90}
            height={90}
            radius={8}
            fill={
              current === index
                ? config.colors?.progress.active.background
                : config.colors?.progress.inactive.background
            }
            justifyContent={"center"}
            alignItems={"center"}
          >
            <Txt
              text={(index + 1).toString()}
              fill={
                current === index
                  ? config.colors?.progress.active.text
                  : config.colors?.progress.inactive.text
              }
              fontSize={68}
              fontWeight={600}
              fontFamily={"Inter"}
            />
          </Rect>
        );
      })}
    </Rect>
  );
};
export default ArticleProgress;
