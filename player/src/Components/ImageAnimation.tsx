/** @jsxImportSource @revideo/2d/lib */
import { z } from "zod";
import { getHotspot } from "../utils/getHotspot";
import { imageSchema, cameraMovementsEnum } from "@videofy/types";
import { Img } from "@revideo/2d";

interface Props {
  asset: z.infer<typeof imageSchema>;
  cameraMovement?: z.infer<typeof cameraMovementsEnum>;
  durationInFrames: number;
}

export const ImageAnimation = ({
  asset,
}: Props) => {
  const hotspot = getHotspot(asset);

  return (
    <Img
       src={asset.url}
       width={"100%"}
       height={"100%"}
       {...({objectFit: "cover", objectPosition: hotspot} as any)}
    />
  );
};
