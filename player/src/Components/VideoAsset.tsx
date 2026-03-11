/** @jsxImportSource @revideo/2d/lib */
import { videoSchema } from "@videofy/types";
import { z } from "zod";
import { Video } from "@revideo/2d";

interface Props {
  asset: z.infer<typeof videoSchema>;
  volume: number;
}

const VideoAsset = ({ asset }: Props) => {
  return (
    <Video
      src={asset.url}
      width={"100%"}
      height={"100%"}
      play={true}
      {...({objectFit: "cover"} as any)}
    />
  );
};

export default VideoAsset;
