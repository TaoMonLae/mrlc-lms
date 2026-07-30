#!/usr/bin/env python3
"""Local, OpenAI-compatible Kokoro-82M speech service for Language Quest.

Kokoro (https://huggingface.co/hexgrad/Kokoro-82M) is a small, Apache-2.0
licensed multilingual TTS model with a published set of named voices
(see VOICES.md in that repo). This server loads one KPipeline per language
code on first use and keeps it warm for subsequent requests.

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
from typing import Any

MAX_TEXT_LENGTH = 500
MAX_BODY_BYTES = 32_768
SAMPLE_RATE = 24_000
DEFAULT_VOICE = "af_heart"
DEFAULT_LANG_CODE = "a"


class SpeechEngine:
    def __init__(self, device: str) -> None:
        from kokoro import KPipeline

        self._pipeline_cls = KPipeline
        # Kokoro autodetects the best available device (cuda/mps/cpu) when no
        # device kwarg is passed; only pass one along if the operator asked
        # for a specific device.
        self._device_kwargs = {} if device in ("", "auto") else {"device": device}
        self._pipelines: dict[str, Any] = {}
        self.lock = threading.Lock()

    def _pipeline_for(self, lang_code: str):
        pipeline = self._pipelines.get(lang_code)
        if pipeline is None:
            pipeline = self._pipeline_cls(lang_code=lang_code, **self._device_kwargs)
            self._pipelines[lang_code] = pipeline
        return pipeline

    def synthesize(self, text: str, voice: str, lang_code: str) -> bytes:
        import numpy as np
        import soundfile as sf

        with self.lock:
            pipeline = self._pipeline_for(lang_code)
            chunks = [audio for _, _, audio in pipeline(text, voice=voice)]
        if not chunks:
            raise RuntimeError("Kokoro produced no audio for this text")
        audio = chunks[0] if len(chunks) == 1 else np.concatenate(chunks)
        output = io.BytesIO()
        sf.write(output, audio, SAMPLE_RATE, format="WAV")
        return output.getvalue()


class SpeechRequestHandler(BaseHTTPRequestHandler):
    server_version = "MRLC-Kokoro/1.0"

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
        self._json(200, {"status": "ready", "model": "hexgrad/Kokoro-82M"})

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
        voice = payload.get("voice") or DEFAULT_VOICE
        lang_code = payload.get("lang_code") or DEFAULT_LANG_CODE
        if not isinstance(voice, str) or not isinstance(lang_code, str):
            self._json(422, {"error": "voice and lang_code must be strings"})
            return

        try:
            audio = self.engine.synthesize(text, voice, lang_code)
        except Exception as error:  # Keep model internals out of HTTP responses.
            print(f"Kokoro synthesis failed: {error}", file=sys.stderr)
            self._json(500, {"error": "Speech generation failed"})
            return

        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(audio)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(audio)

    def log_message(self, message: str, *args: Any) -> None:
        print(f"[kokoro] {self.address_string()} {message % args}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Kokoro-82M speech for MRLC Language Quest")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8810)
    parser.add_argument("--device", default="auto")
    args = parser.parse_args()

    engine = SpeechEngine(device=args.device)
    server = ThreadingHTTPServer((args.host, args.port), SpeechRequestHandler)
    server.engine = engine  # type: ignore[attr-defined]
    print(f"Language Quest Kokoro ready at http://{args.host}:{args.port}", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
