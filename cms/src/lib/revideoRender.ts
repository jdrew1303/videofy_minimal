import { mkdir } from "node:fs/promises";
import path from "node:path";
import { renderVideo } from "@revideo/renderer";

export type RenderOrientation = "vertical" | "horizontal";

type RenderInput = {
  projectId: string;
  orientation: RenderOrientation;
  manuscripts: unknown[];
  playerConfig: unknown;
  voice: boolean;
  backgroundMusic: boolean;
  disabledLogo: boolean;
};

function resolveProjectFile(): string {
  return path.join(process.cwd(), "..", "player", "src", "project.ts");
}

export function getOutputFilePath(projectId: string, orientation: RenderOrientation): string {
  return path.join(process.cwd(), "..", "projects", projectId, "output", `render-${orientation}.mp4`);
}

export async function renderProjectVideo(input: RenderInput): Promise<string> {
  const width = input.orientation === "vertical" ? 1080 : 1920;
  const height = input.orientation === "vertical" ? 1920 : 1080;

  const variables = {
    manuscripts: input.manuscripts,
    playerConfig: input.playerConfig,
    width,
    height,
    voice: input.voice,
    backgroundMusic: input.backgroundMusic,
    disabledLogo: input.disabledLogo,
  };

  const projectFile = resolveProjectFile();
  const outputFile = getOutputFilePath(input.projectId, input.orientation);
  await mkdir(path.dirname(outputFile), { recursive: true });

  await renderVideo({
    projectFile,
    variables,
    settings: {
      outFile: outputFile as any,
      workers: 1,
    }
  });

  return outputFile;
}
