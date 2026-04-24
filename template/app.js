document.addEventListener("DOMContentLoaded", () => {
  const listing = document.getElementById("listing");
  const upButton = document.getElementById("upButton");
  const downloadAll = document.getElementById("downloadAll");
  const fileInput = document.getElementById("file");
  const alertEl = document.getElementById("alert");
  const header = document.getElementById("header");
  const loader = document.getElementById("loader");
  const headerBase = "Directory listing of ";
  let currentDir = "./";
  const entryCollator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  // Document

  function showAlert(msg, ms = 3000) {
    alertEl.textContent = msg;
    alertEl.classList.add("visible");
    clearTimeout(showAlert._t);
    showAlert._t = setTimeout(() => alertEl.classList.remove("visible"), ms);
  }

  function setLoading(isLoading) {
    loader.hidden = !isLoading;
    document
      .querySelectorAll("button")
      .forEach((b) => (b.disabled = isLoading));
    fileInput.disabled = isLoading;
  }

  window.addEventListener("popstate", (ev) => {
    const dir = ev.state && ev.state.dir ? ev.state.dir : "./";
    fetchItems(dir);
  });

  upButton.addEventListener("click", () => {
    // remove trailing slash
    const segs = currentDir.replace(/\/$/, "").split("/");
    // remove last segment
    segs.pop();
    let next = segs.join("/");
    next = normalizePath(next);
    navigateTo(next, true);
  });

  downloadAll.addEventListener("click", () => {
    downloadAllFiles();
  });

  fileInput.addEventListener("change", () => {
    uploadFile();
  });

  // init from URL or default
  (function init() {
    // check ?dir=... param
    const params = new URLSearchParams(location.search);
    let dir = params.get("dir") || currentDir;
    // if dir appears encoded, decode safely
    try {
      dir = decodeURIComponent(dir);
    } catch (e) {}
    fetchItems(normalizePath(dir));
  })();

  // Helpers

  function sanitizeDisplayDir(dir) {
    // show root as "/"
    if (dir === "./" || dir === "") return "/";
    // remove leading './' and keep rest
    return dir.startsWith("./") ? dir.slice(1) : dir;
  }

  function normalizePath(path) {
    if (!path || path === "/") return "./";
    const p = path.replace(/\/{2,}/g, "/");
    return p.endsWith("/") ? p : p + "/";
  }

  function sortEntries(entries) {
    return [...(entries || [])]
      .map((name, index) => ({ name, index }))
      .sort(
        (left, right) =>
          entryCollator.compare(left.name, right.name) ||
          left.index - right.index,
      )
      .map((entry) => entry.name);
  }

  /// encode params url builders
  function directoryUrl(path) {
    const params = new URLSearchParams({ directory: path });
    return `/directory-list?${params.toString()}`;
  }

  function fileUrl(path, file) {
    const params = new URLSearchParams({ path: path + file });
    return `/get-file?${params.toString()}`;
  }

  // Core

  // create item node
  function createListItem(name, type, onClick) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "entry";
    a.textContent = name;
    a.setAttribute("data-type", type);
    a.setAttribute("role", "link");
    a.href = "#";
    a.tabIndex = 0;

    a.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    });
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      onClick();
    });

    li.appendChild(a);
    return li;
  }

  async function renderItems(data) {
    listing.innerHTML = "";
    if (!data || typeof data !== "object") {
      listing.appendChild(
        createListItem("Error loading items", "file", () => {}),
      );
      return;
    }
    // directories first
    sortEntries(data.directories).forEach((dirName) => {
      listing.appendChild(
        createListItem(dirName, "directory", () => {
          // navigate into dir
          const nextDir = normalizePath(currentDir + dirName + "/");
          navigateTo(nextDir, true);
        }),
      );
    });
    sortEntries(data.files).forEach((fileName) => {
      listing.appendChild(
        createListItem(fileName, "file", () => getFile(fileName)),
      );
    });
  }

  /// fetch directory listing
  async function fetchItems(dir) {
    try {
      setLoading(true);
      const url = directoryUrl(dir);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      await renderItems(data);
      // update UI state
      currentDir = dir;
      upButton.hidden = currentDir === "./";
      header.textContent = headerBase + sanitizeDisplayDir(currentDir);
    } catch (err) {
      console.error("fetchItems:", err);
      showAlert("Failed to load directory: " + err.message, 4000);
      listing.innerHTML = "<li>Error loading items</li>";
    } finally {
      setLoading(false);
    }
  }

  // download one file
  async function getFile(fileName) {
    try {
      setLoading(true);
      const url = fileUrl(currentDir, fileName);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(res.statusText || "Failed to fetch file");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("getFile:", err);
      showAlert("Failed to download file: " + err.message, 4000);
    } finally {
      setLoading(false);
    }
  }

  async function downloadAllFiles() {
    const fileLinks = Array.from(
      document.querySelectorAll('a.entry[data-type="file"]'),
    );

    if (fileLinks.length === 0) {
      showAlert("No files to download");
      return;
    }

    const queue = fileLinks.map((a) => a.textContent);
    const CONCURRENCY = 3;

    async function worker() {
      while (queue.length) {
        const file = queue.shift();
        await getFile(file);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  async function uploadFile(params) {
    const f = fileInput.files[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    const uploadUrl = `/?directory=${encodeURIComponent(currentDir)}`;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        showAlert(`Uploading ${f.name}: ${pct}%`, 1500);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        showAlert("Upload successful");
        // refresh listing
        navigateTo(currentDir, false);
      } else {
        showAlert("Upload failed: " + xhr.statusText, 4000);
      }
    };

    xhr.onerror = () => showAlert("Upload error", 4000);
    xhr.send(fd);
  }

  // navigateTo: call fetchItems and push history optionally
  async function navigateTo(path, push = false) {
    const normalized = normalizePath(path);
    await fetchItems(normalized);
    if (push) {
      history.pushState(
        { dir: normalized },
        "",
        `?dir=${encodeURIComponent(normalized)}`,
      );
    }
  }
});
