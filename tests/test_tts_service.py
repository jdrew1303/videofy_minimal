from pathlib import Path
from unittest.mock import MagicMock

import api.tts_service as tts_module


class FakeMessage:
    def __init__(self, content):
        self.content = content


class FakeChoice:
    def __init__(self, content):
        self.message = FakeMessage(content)


class FakeResponse:
    def __init__(self, content):
        self.choices = [FakeChoice(content)]


class FakeChatCompletions:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        # Return 7 dummy audio tokens repeated to make a valid reshape(-1, 7)
        tokens = " ".join(["<custom_token_1>"] * 7)
        return FakeResponse(tokens)


class FakeChat:
    def __init__(self):
        self.completions = FakeChatCompletions()


class FakeOpenAIClient:
    last_instance = None

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.chat = FakeChat()
        FakeOpenAIClient.last_instance = self


def test_tts_service_calls_local_tts_orpheus_style(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(tts_module, "OpenAI", FakeOpenAIClient)

    # Mock SNAC model and soundfile
    mock_snac = MagicMock()
    mock_snac_instance = MagicMock()
    mock_snac.from_pretrained.return_value = mock_snac_instance
    mock_snac_instance.decode.return_value = [MagicMock()]
    mock_snac_instance.parameters.return_value = iter([MagicMock(device="cpu")])
    monkeypatch.setattr("snac.SNAC", mock_snac)

    mock_sf = MagicMock()
    monkeypatch.setattr("soundfile.write", mock_sf)

    # Mock subprocess.run for ffmpeg
    mock_run = MagicMock()
    monkeypatch.setattr("subprocess.run", mock_run)

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
    assert len(client.chat.completions.calls) == 1

    payload = client.chat.completions.calls[0]
    assert payload["model"] == "custom-model"
    assert "brand-voice-id" in payload["messages"][0]["content"]
    assert "Hei verden" in payload["messages"][0]["content"]

    assert mock_sf.called
    assert mock_run.called
