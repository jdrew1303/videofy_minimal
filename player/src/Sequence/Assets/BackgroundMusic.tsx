/** @jsxImportSource @revideo/2d/lib */
import { processedManuscriptSchema } from "@videofy/types";
import { z } from "zod";
import { Audio } from "@revideo/2d";

interface Props {
  manuscripts: Array<z.infer<typeof processedManuscriptSchema>>;
  backgroundMusic?: string;
  volume?: number;
}

export const BackgroundMusic = ({ backgroundMusic }: Props) => {
  if (!backgroundMusic) {
    return null;
  }
  return (
    <Audio src={backgroundMusic} play={true} loop={true} />
  );
};
