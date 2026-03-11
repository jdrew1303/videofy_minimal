/** @jsxImportSource @revideo/2d/lib */
import { z } from "zod";
import { customCutsSchema } from "@videofy/types";
import { useScene } from "@revideo/core";
import { Video } from "@revideo/2d";

interface Props {
  duration: number;
  asset: z.infer<typeof customCutsSchema>;
}

export const Wipe = ({ asset }: Props) => {
  const width = useScene().variables.get("width", 1080)();
  const height = useScene().variables.get("height", 1920)();
  const isPortrait = height > width;

  return (
    <Video
      src={isPortrait ? asset.portrait : asset.landscape}
      width={"100%"}
      height={"100%"}
      play={true}
      {...({objectFit: "cover"} as any)}
    />
  );
};
