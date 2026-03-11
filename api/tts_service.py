from __future__ import annotations

import logging
import subprocess
import re
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
        self._snac_model = None

    def _get_snac_model(self):
        if self._snac_model is None:
            try:
                from snac import SNAC
                import torch
                self._snac_model = SNAC.from_pretrained("hubertsiuzdak/snac_24khz")
                self._snac_model.eval()
                if torch.cuda.is_available():
                    self._snac_model = self._snac_model.to("cuda")
            except Exception as e:
                logger.error(f"Failed to load SNAC model: {e}")
                raise
        return self._snac_model

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
        voice = voice_id or "tara"

        logger.info(
            "Calling local TTS synthesis via Chat Completions for Orpheus with model_id=%s, voice=%s",
            target_model,
            voice
        )

        # Orpheus uses Chat Completions to generate audio tokens
        # The prompt format is typically: voice: <voice_name>\ntext: <text>
        prompt = f"voice: {voice}\ntext: {text}"

        response = self._client.chat.completions.create(
            model=target_model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("No content returned from LLM")

        # Extract audio tokens using regex
        audio_tokens_regex = re.compile(r"<custom_token_(\d+)>")
        audio_ids = [int(m) for m in audio_tokens_regex.findall(content)]

        if not audio_ids:
            raise ValueError("No audio tokens found in the response")

        import torch
        import soundfile as sf

        snac_model = self._get_snac_model()
        device = next(snac_model.parameters()).device

        audio_ids_t = torch.tensor(audio_ids, dtype=torch.int32).to(device).reshape(-1, 7)

        codes_0 = audio_ids_t[:, 0].unsqueeze(0)
        codes_1 = torch.stack((audio_ids_t[:, 1], audio_ids_t[:, 4])).t().flatten().unsqueeze(0)
        codes_2 = (
            torch.stack((audio_ids_t[:, 2], audio_ids_t[:, 3], audio_ids_t[:, 5], audio_ids_t[:, 6]))
            .t()
            .flatten()
            .unsqueeze(0)
        )

        with torch.inference_mode():
            audio_hat = snac_model.decode([codes_0, codes_1, codes_2])

        audio_data = audio_hat[0].cpu().numpy()

        # Save as temporary WAV then convert to MP3 using ffmpeg
        temp_wav = output_mp3.with_suffix(".wav")
        sf.write(temp_wav, audio_data, 24000)

        cmd = [
            self._ffmpeg_bin,
            "-y",
            "-i", str(temp_wav),
            "-codec:a", "libmp3lame",
            "-q:a", "2",
            str(output_mp3)
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        temp_wav.unlink(missing_ok=True)

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
