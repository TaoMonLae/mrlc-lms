#!/usr/bin/env python3
"""Local, OpenAI-compatible VoxCPM speech service for Language Quest.

The service binds to loopback by default. The LMS server should be the only
client exposed to learners; do not publish this port directly to the internet.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
VOXCPM_SRC = ROOT / "VoxCPM" / "src"
if VOXCPM_SRC.is_dir():
    sys.path.insert(0, str(VOXCPM_SRC))

MAX_TEXT_LENGTH = 500
MAX_BODY_BYTES = 32_768


class SpeechEngine:
    def __init__(
        self,
        model_id: str,
        device: str,
        optimize: bool,
        voice: str,
        inference_steps: int,
    ) -> None:
        from voxcpm import VoxCPM

        self.model_id = model_id
        self.voice = re.sub(r"[()（）]", "", voice).strip()
        self.inference_steps = inference_steps
        self.lock = threading.Lock()
        self.model = VoxCPM.from_pretrained(
            model_id,
            load_denoiser=False,
            optimize=optimize,
            device=device,
        )

    def synthesize(self, text: str, requested_voice: str | None = None) -> bytes:
        import soundfile as sf

        voice = re.sub(r"[()（）]", "", requested_voice or self.voice).strip()
        target = f"({voice}){text}" if voice else text
        with self.lock:
            wav = self.model.generate(
                text=target,
                cfg_value=2.0,
                inference_timesteps=self.inference_steps,
                normalize=True,
                seed=42,
            )
        output = io.BytesIO()
        sf.write(output, wav, self.model.tts_model.sample_rate, format="WAV")
        return output.getvalue()


class SpeechRequestHandler(BaseHTTPRequestHandler):
    server_version = "MRLC-VoxCPM/1.0"

    @property
    def engine(self) -> SpeechEngine:
        return self.server.engine  # type: ignore[attr-defined]

    def _json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path.rstrip("/") != "/health":
            self._json(404, {"error": "Not found"})
            return
        self._json(200, {"status": "ready", "model": self.engine.model_id})

    def do_POST(self) -> None:
        if self.path.rstrip("/") != "/v1/audio/speech":
            self._json(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._json(400, {"error": "Invalid Content-Length"})
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            self._json(413, {"error": "Request body is empty or too large"})
            return
        try:
            payload = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(400, {"error": "Request body must be valid JSON"})
            return

        text = re.sub(r"\s+", " ", str(payload.get("input", ""))).strip()
        if not text or len(text) > MAX_TEXT_LENGTH:
            self._json(422, {"error": f"input must contain 1-{MAX_TEXT_LENGTH} characters"})
            return
        voice = payload.get("voice")
        if voice is not None and not isinstance(voice, str):
            self._json(422, {"error": "voice must be a string"})
            return

        try:
            audio = self.engine.synthesize(text, voice)
        except Exception as error:  # Keep model internals out of HTTP responses.
            print(f"VoxCPM synthesis failed: {error}", file=sys.stderr)
            self._json(500, {"error": "Speech generation failed"})
            return

        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(audio)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(audio)

    def log_message(self, message: str, *args: Any) -> None:
        print(f"[voxcpm] {self.address_string()} {message % args}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve VoxCPM speech for MRLC Language Quest")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8810)
    parser.add_argument("--model", default="openbmb/VoxCPM2")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--voice", default="A warm, clear teacher voice with patient pronunciation and a friendly pace")
    parser.add_argument("--steps", type=int, default=10)
    parser.add_argument("--no-optimize", action="store_true")
    args = parser.parse_args()

    engine = SpeechEngine(
        model_id=args.model,
        device=args.device,
        optimize=not args.no_optimize,
        voice=args.voice,
        inference_steps=max(1, min(args.steps, 50)),
    )
    server = ThreadingHTTPServer((args.host, args.port), SpeechRequestHandler)
    server.engine = engine  # type: ignore[attr-defined]
    print(f"Language Quest VoxCPM ready at http://{args.host}:{args.port}", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
