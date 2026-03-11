/** @jsxImportSource @revideo/2d/lib */
import {
  Audio,
  Img,
  Video,
  makeScene2D,
  Rect,
} from "@revideo/2d";
import {
  waitFor,
  useScene,
  createRef,
} from "@revideo/core";
import {
  playerSchema,
  type processedManuscriptSchema,
} from "@videofy/types";
import { z } from "zod";
import {
  getSelectedReporterIntro,
  getSelectedReporterOutro,
} from "./utils/findSelectedReporterVideo";
import { getAssetUrl } from "./utils/getAssetUrl";
import { getHotspot } from "./utils/getHotspot";
import { Text } from "./Components/Text";
import ArticleProgress from "./Components/ArticleProgress";
import { calculateCameraMovement } from "./utils/calculateCameraMovement";

type Manuscript = z.infer<typeof processedManuscriptSchema>;
type PlayerConfig = z.infer<typeof playerSchema>;

export interface ArticleSeriesProps {
  manuscripts: Manuscript[];
  width?: number;
  height?: number;
  voice?: boolean;
  backgroundMusic?: boolean;
  disabledLogo?: boolean;
  playerConfig: PlayerConfig;
}

export const ArticlesSeries = makeScene2D("ArticlesSeries", function* (view) {
  const manuscripts = useScene().variables.get("manuscripts", [] as Manuscript[])();
  const voice = useScene().variables.get("voice", true)();
  const backgroundMusicEnabled = useScene().variables.get("backgroundMusic", true)();
  const playerConfig = useScene().variables.get("playerConfig", {} as PlayerConfig)();
  const width = useScene().variables.get("width", 1080)();
  const height = useScene().variables.get("height", 1920)();

  const assetBaseUrl = playerConfig.assetBaseUrl || "";

  // Background Music (Across entire video)
  if (backgroundMusicEnabled && playerConfig.backgroundMusic) {
    view.add(
      <Audio
        src={getAssetUrl(assetBaseUrl, playerConfig.backgroundMusic)}
        play={true}
        loop={true}
        volume={playerConfig.backgroundMusicVolume ?? 0.2}
      />
    );
  }

  // 1. Intro
  if (playerConfig.intro) {
    const introSrc = width > height ? playerConfig.intro.landscape : playerConfig.intro.portrait;
    const introFullUrl = getAssetUrl(assetBaseUrl, introSrc);
    const introVideo = createRef<Video>();
    view.add(
      <Video
        ref={introVideo}
        src={introFullUrl}
        width={width}
        height={height}
        play={true}
        {...({objectFit: "cover"} as any)}
      />
    );
    yield* waitFor(playerConfig.intro.duration);
    introVideo().remove();
  }

  // 2. Reporter Intro
  const reporterIntro = getSelectedReporterIntro(playerConfig);
  if (reporterIntro) {
    const introSrc = width > height ? reporterIntro.landscape : reporterIntro.portrait;
    const introFullUrl = getAssetUrl(assetBaseUrl, introSrc);
    const reporterVideo = createRef<Video>();
    view.add(
      <Video
        ref={reporterVideo}
        src={introFullUrl}
        width={width}
        height={height}
        play={true}
        {...({objectFit: "cover"} as any)}
      />
    );
    yield* waitFor(reporterIntro.duration);
    reporterVideo().remove();
  }

  // 3. Articles & Segments
  for (const [mIdx, manuscript] of manuscripts.entries()) {
    const progressRef = createRef<Rect>();
    view.add(
      <Rect ref={progressRef}>
        <ArticleProgress current={mIdx} length={manuscripts.length} config={playerConfig} />
      </Rect>
    );

    for (const segment of manuscript.segments) {
      const primaryAsset = segment.images?.[0];
      const segmentDuration = segment.customAudio?.length || (segment.end - segment.start);

      const segmentContainer = createRef<Rect>();
      const assetRef = createRef<Img | Video>();

      view.add(
        <Rect ref={segmentContainer} width={width} height={height} clip>
          {primaryAsset?.type === "image" && (
             <Img
               ref={assetRef as any}
               src={primaryAsset.url}
               width={"100%"}
               height={"100%"}
               {...({objectFit: "cover", objectPosition: getHotspot(primaryAsset)} as any)}
             />
          )}
          {primaryAsset?.type === "video" && (
            <Video
              ref={assetRef as any}
              src={primaryAsset.url}
              width={"100%"}
              height={"100%"}
              play={true}
              time={primaryAsset.startFrom || 0}
              {...({objectFit: "cover"} as any)}
            />
          )}
        </Rect>
      );

      if (primaryAsset?.type === "image") {
          const movementType = segment.cameraMovement || "zoom-in";
          const startState = calculateCameraMovement(0, movementType);
          const endState = calculateCameraMovement(2, movementType);

          assetRef().scale(startState.scale);
          assetRef().position([startState.posX, startState.posY]);
          assetRef().rotation(startState.rotation);

          assetRef().scale(endState.scale, segmentDuration);
          assetRef().position([endState.posX, endState.posY], segmentDuration);
          assetRef().rotation(endState.rotation, segmentDuration);
      }

      // Audio and Text
      let audioRef: any;
      if (voice && manuscript.meta.audio?.src && !segment.customAudio?.length) {
         audioRef = createRef<Audio>();
         view.add(
           <Audio
             ref={audioRef}
             src={manuscript.meta.audio.src}
             play={true}
             time={segment.start}
           />
         );
      } else if (segment.customAudio?.src) {
         audioRef = createRef<Audio>();
         view.add(
           <Audio
             ref={audioRef}
             src={segment.customAudio.src}
             play={true}
           />
         );
      }

      let elapsedInSegment = 0;
      const sortedTexts = [...segment.texts].sort((a, b) => a.start - b.start);

      for (const textLine of sortedTexts) {
        if (!textLine.text) continue;

        const relativeStart = textLine.start - segment.start;
        const duration = textLine.end - textLine.start;

        if (relativeStart > elapsedInSegment) {
          yield* waitFor(relativeStart - elapsedInSegment);
          elapsedInSegment = relativeStart;
        }

        const textRef = createRef<Rect>();
        view.add(
          <Rect ref={textRef}>
            <Text titleText={textLine.text} placement={segment.style} config={playerConfig} />
          </Rect>
        );

        yield* waitFor(duration);
        elapsedInSegment += duration;
        textRef().remove();
      }

      if (segmentDuration > elapsedInSegment) {
        yield* waitFor(segmentDuration - elapsedInSegment);
      }

      segmentContainer().remove();
      if (audioRef?.()) audioRef().remove();
    }

    progressRef().remove();

    // Wipe between articles
    if (playerConfig.wipe && mIdx < manuscripts.length - 1) {
      const wipeSrc = width > height ? playerConfig.wipe.landscape : playerConfig.wipe.portrait;
      const wipeFullUrl = getAssetUrl(assetBaseUrl, wipeSrc);
      const wipeVideo = createRef<Video>();
      view.add(
        <Video
          ref={wipeVideo}
          src={wipeFullUrl}
          width={width}
          height={height}
          play={true}
          {...({objectFit: "cover"} as any)}
        />
      );
      yield* waitFor(playerConfig.wipe.duration);
      wipeVideo().remove();
    }
  }

  // 4. Reporter Outro
  const reporterOutro = getSelectedReporterOutro(playerConfig);
  if (reporterOutro) {
    const outroSrc = width > height ? reporterOutro.landscape : reporterOutro.portrait;
    const outroFullUrl = getAssetUrl(assetBaseUrl, outroSrc);
    const reporterVideo = createRef<Video>();
    view.add(
      <Video
        ref={reporterVideo}
        src={outroFullUrl}
        width={width}
        height={height}
        play={true}
        {...({objectFit: "cover"} as any)}
      />
    );
    yield* waitFor(reporterOutro.duration);
    reporterVideo().remove();
  }

  // 5. Outro
  if (playerConfig.outro) {
    const outroSrc = width > height ? playerConfig.outro.landscape : playerConfig.outro.portrait;
    const outroFullUrl = getAssetUrl(assetBaseUrl, outroSrc);
    const outroVideo = createRef<Video>();
    view.add(
      <Video
        ref={outroVideo}
        src={outroFullUrl}
        width={width}
        height={height}
        play={true}
        {...({objectFit: "cover"} as any)}
      />
    );
    yield* waitFor(playerConfig.outro.duration);
    outroVideo().remove();
  }
});
