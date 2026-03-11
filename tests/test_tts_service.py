from pathlib import Path

import api.tts_service as tts_module


class FakeSpeechResponse:
    def stream_to_file(self, path):
        path.write_bytes(b"abc")


class FakeSpeechAPI:
    def __init__(self):
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return FakeSpeechResponse()


class FakeAudioAPI:
    def __init__(self):
        self.speech = FakeSpeechAPI()


class FakeOpenAIClient:
    last_instance = None

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.audio = FakeAudioAPI()
        FakeOpenAIClient.last_instance = self


def test_tts_service_calls_local_tts_create_with_voice_id(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(tts_module, "OpenAI", FakeOpenAIClient)

    service = tts_module.LocalTTSService(
        api_key="test-api-key",
        model_id="default-model",
        base_url="http://localhost:1234/v1",
        ffprobe_bin="ffprobe",
        ffmpeg_bin="ffmpeg",
    )

    out = tmp_path / "line.mp3"
    service.synthesize_line(
        text="Hei verden",
        output_mp3=out,
        voice_id="brand-voice-id",
        model_id="custom-model",
    )

    client = FakeOpenAIClient.last_instance
    assert client is not None
    assert len(client.audio.speech.calls) == 1

    payload = client.audio.speech.calls[0]
    assert payload["voice"] == "brand-voice-id"
    assert payload["model"] == "custom-model"
    assert payload["input"] == "Hei verden"
    assert out.read_bytes() == b"abc"
