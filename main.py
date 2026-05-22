from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
import yt_dlp
import uuid
import os

app = FastAPI()

DOWNLOAD_FOLDER = "downloads"

os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

@app.get("/")
def home():
    return {"message": "Downloader Running"}

@app.get("/download")
def download_video(url: str):

    try:

        file_id = str(uuid.uuid4())
        output_path = f"{DOWNLOAD_FOLDER}/{file_id}.mp4"

        ydl_opts = {
    "format": "best",
    "outtmpl": output_path,
    "quiet": True,
    "merge_output_format": "mp4",
	"cookiefile": "cookies.txt",

    "extractor_args": {
        "youtube": {
            "player_client": ["android"]
        }
    }
}

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename="video.mp4"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))