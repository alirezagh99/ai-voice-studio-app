import io
import os
from typing import Optional
import uuid

import modal 

from pydantic import BaseModel 

import torch
import torchaudio
import requests

app = modal.App("ai-voice-studio")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
    .run_commands("pip install pydantic && python -c 'import pydantic; print(\"OK\")'")
    .apt_install("ffmpeg")
)

volume = modal.Volume.from_name("hf-cache-ai-voice-studio", create_if_missing=True)

cloudinary_secret = modal.Secret.from_name("ai-voice-studio-secret-2")
class TextToSpeechRequest(BaseModel):
    text: str
    voice_url: Optional[str] = None
    language: str = "en"
    exaggeration: float = 0.5
    cfg_weight: float = 0.5


class TextToSpeechResponse(BaseModel):
    audio_url: str

@app.cls(
    image=image,
    gpu="L40S",
    volumes={
        "/root/.cache/huggingface": volume,
    },
    scaledown_window=120,
    secrets=[cloudinary_secret]
)

class TextToSpeechServer:
    @modal.enter()
    def load_model(self):
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        import cloudinary

        self.model = ChatterboxMultilingualTTS.from_pretrained(device="cuda")

        cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
        secure=True,
        )
        

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    def generate_speech(self, request: TextToSpeechRequest) -> TextToSpeechResponse:
        with torch.no_grad():
            if request.voice_url:

                response = requests.get(request.voice_url)
                response.raise_for_status()

                prompt_path = "/tmp/prompt.wav"

                with open(prompt_path, "wb") as f:
                    f.write(response.content)

                wav = self.model.generate(
                    request.text,
                    audio_prompt_path=prompt_path,
                    language_id=request.language,
                    exaggeration=request.exaggeration,
                    cfg_weight=request.cfg_weight,
                )
            else:
                wav = self.model.generate(
                    request.text,
                    language_id=request.language,
                    exaggeration=request.exaggeration,
                    cfg_weight=request.cfg_weight
                )
            wav_cpu = wav.cpu()

        # Convert the audio tensor to WAV format bytes
        buffer = io.BytesIO()  # Create an in-memory buffer
        torchaudio.save(buffer, wav_cpu, self.model.sr, format="wav")  # Save as WAV
        buffer.seek(0)  # Reset buffer position to start
        audio_bytes = buffer.read()  # Read all bytes            


        import cloudinary.uploader

        audio_uuid = str(uuid.uuid4())

        result = cloudinary.uploader.upload(
        io.BytesIO(audio_bytes),
        resource_type="video",  # Cloudinary stores audio as video
        folder="tts",
        public_id=audio_uuid,
        overwrite=False,
        )

        audio_url = result["secure_url"]

        return TextToSpeechResponse(
            audio_url=audio_url
        )