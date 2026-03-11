from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any

from openai import OpenAI

logger = logging.getLogger(__name__)


class LocalTTSService:
    def __init__(self, api_key: str, model_id: str, base_url: str, ffprobe_bin: str, ffmpeg_bin: str):
        self._api_key = api_key
        self._model_id = model_id
        self._base_url = base_url
        self._ffprobe_bin = ffprobe_bin
        self._ffmpeg_bin = ffmpeg_bin
        self._client = OpenAI(api_key=api_key, base_url=base_url)

    def synthesize_line(
        self,
        text: str,
        output_mp3: Path,
        voice_id: str | None = None,
        model_id: str | None = None,
        voice_settings: dict[str, Any] | None = None,
    ) -> None:
        if not self._client:
            raise ValueError("TTS client is not initialized")

        output_mp3.parent.mkdir(parents=True, exist_ok=True)

        target_model = model_id or self._model_id

        logger.info(
            "Calling local TTS synthesis with model_id=%s",
            target_model,
        )

        # Using OpenAI-compatible speech endpoint
        response = self._client.audio.speech.create(
            model=target_model,
            voice=voice_id or "alloy", # voice_id might be used as 'voice' in OpenAI spec
            input=text,
        )

        response.stream_to_file(output_mp3)

    def get_duration_seconds(self, audio_file: Path) -> float:
        cmd = [
            self._ffprobe_bin,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(audio_file),
        ]
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        return max(0.0, float(result.stdout.strip() or 0.0))

    def concat_mp3(self, inputs: list[Path], output_file: Path) -> None:
        if not inputs:
            raise ValueError("Cannot concatenate zero audio files")

        output_file.parent.mkdir(parents=True, exist_ok=True)
        concat_file = output_file.parent / "concat.txt"
        concat_lines = [f"file '{path.resolve()}'" for path in inputs]
        concat_file.write_text("\n".join(concat_lines), encoding="utf-8")

        cmd = [
            self._ffmpeg_bin,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-c:a",
            "libmp3lame",
            "-q:a",
            "2",
            str(output_file),
        ]
        subprocess.run(cmd, check=True, capture_output=True)

    def create_silence_mp3(self, duration_seconds: float, output_file: Path) -> None:
        if duration_seconds <= 0:
            raise ValueError("Silence duration must be positive")

        output_file.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            self._ffmpeg_bin,
            "-y",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=mono",
            "-t",
            f"{duration_seconds:.3f}",
            "-c:a",
            "libmp3lame",
            "-q:a",
            "2",
            str(output_file),
        ]
        subprocess.run(cmd, check=True, capture_output=True)
