#!P-REPLACE

from typing import Annotated
import argparse
import logging
import mimetypes
import os
import sys
import asyncio

from fastapi import FastAPI, UploadFile, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from hypercorn.asyncio import serve
from hypercorn.config import Config

logging.basicConfig(format="%(message)s")

INDEX_PATH = "I-REPLACE"
UPLOADS_PATH = "U-REPLACE"

app = FastAPI(docs_url=None, redoc_url=None)


@app.get("/directory-list")
async def directory_list(directory: Annotated[str, Query()] = "./"):
    full_path = os.path.join(ROOT_DIRECTORY, directory)

    try:
        listing = os.listdir(full_path)
    except FileNotFoundError:
        raise HTTPException(status_code=400, detail="File not found")

    directories = []
    files = []
    for i in listing:
        if os.path.isdir(os.path.join(full_path, i)):
            directories.append(i)
        else:
            files.append(i)

    response = {"directories": directories, "files": files}

    return JSONResponse(response)


@app.get("/get-file")
async def get_file(path: Annotated[str, Query()]):
    scope = {"method": "GET", "headers": []}
    response = await FILES.get_response(path, scope)

    return response


@app.post("/")
async def recive_file(file: UploadFile):
    filename = file.filename
    content = await file.read()

    file_format = "wb"
    mime_type, _ = mimetypes.guess_type(filename)
    if mime_type:
        if mime_type.startswith("text"):
            file_format = "w"

    with open(os.path.join(UPLOADS_PATH, filename), file_format) as f:
        f.write(content)

    return JSONResponse(content="", status_code=201)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog="static server with steroids")
    parser.add_argument("-i", "--ip", default="127.0.0.1", help="your ip to listen")
    parser.add_argument("-p", "--port", type=int, default=8080, help="port to listen")
    parser.add_argument(
        "-d", "--directory", required=True, help="path to the directory"
    )

    args = parser.parse_args()

    ROOT_DIRECTORY = os.path.abspath(args.directory)

    if not os.path.isdir(ROOT_DIRECTORY):
        logging.error("FileNotFound Error")
        sys.exit(1)

    FILES = StaticFiles(directory=ROOT_DIRECTORY)

    app.mount("/", StaticFiles(directory=INDEX_PATH, html=True))
    app.mount("/files/", FILES, name="files")

    config = Config()
    config.bind = [f"{args.ip}:{args.port}"]
    config.include_server_header = False

    asyncio.run(serve(app=app, config=config))
