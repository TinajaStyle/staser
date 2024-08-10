import subprocess
import argparse
import sys
import os
import shutil


def install(path: str, index_path: str, uploads_path: str, user_uid: int | None):
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"]
    )

    if path.startswith("~"):
        path = os.path.expanduser(path)
    index_path = os.path.abspath(index_path)
    uploads_path = os.path.abspath(uploads_path)

    with open("staser.py", "r") as f:
        content = f.read()

    content = content.replace("P-REPLACE", sys.executable)
    content = content.replace("I-REPLACE", index_path)
    content = content.replace("U-REPLACE", uploads_path)

    bin_path = os.path.join(path, "staser")
    with open(bin_path, "w") as f:
        f.write(content)
    os.chmod(bin_path, 0o755)

    if user_uid:
        os.setuid(user_uid)

    if not os.path.exists(index_path):
        os.mkdir(index_path)

    if not os.path.exists(uploads_path):
        os.mkdir(uploads_path)

    js_path = os.path.join(index_path, "app.js")
    css_path = os.path.join(index_path, "app.css")
    html_path = os.path.join(index_path, "index.html")

    if not os.path.exists(js_path):
        shutil.copy("staser_template/app.js", js_path)

    if not os.path.exists(css_path):
        shutil.copy("staser_template/app.css", css_path)

    if not os.path.exists(html_path):
        shutil.copy("staser_template/index.html", html_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser("Staser-Install", "python3 install.py [flags]")

    parser.add_argument(
        "-p",
        "--path",
        default="~/.local/bin",
        help="Path to put the staser (recommend a path in the env $PATH), default: ~/.local/bin",
    )
    parser.add_argument(
        "-i",
        "--index-path",
        default="staser_template",
        help="Path to put the index page, default: actual path + staser_template",
    )
    parser.add_argument(
        "-u",
        "--uploads-path",
        default="uploads",
        help="Path to put the uploads files, default: actual path + uploads",
    )
    parser.add_argument(
        "-U",
        "--user-uid",
        type=int,
        help="Use if you want to put it in a privileged path"
        " like /bin but you want to keep your directories as a normal user",
    )

    args = parser.parse_args()

    install(args.path, args.index_path, args.uploads_path, args.user_uid)

    print("\nInstall sucessfull try: staser -h\n")
