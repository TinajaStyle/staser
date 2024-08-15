document.addEventListener('DOMContentLoaded', async function () {
    const listing = document.getElementById('listing');
    const upButton = document.getElementById('upButton');
    const downloadAll = document.getElementById('downloadAll');
    const fileInput = document.getElementById('file');
    const alert = document.getElementById('alert')
    const header = document.getElementById('header');
    const headerText = "Directory listing of ";
    let currentDir = "./";

    function createListItem(name, type, clickHandler) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = name;
        a.setAttribute('data-type', type);
        a.addEventListener('click', clickHandler);
        li.appendChild(a);
        return li;
    }

    function renderItems(data) {
        if (!data) {
            listing.innerHTML = "<li>Error loading items</li>";
            return;
        }

        listing.innerHTML = "";

        data.directories.forEach(directory => {
            listing.appendChild(createListItem(directory, 'directory', function () {
                getItems(directory);
            }));
        });

        data.files.forEach(file => {
            listing.appendChild(createListItem(file, 'file', function () {
                getFile(file);
            }));
        });
    }

    async function getItems(dir = "") {
        try {
            const targetDir = dir === "" ? currentDir : currentDir + dir + "/";

            const response = await fetch(`/directory-list?directory=${targetDir}`);
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            renderItems(data);

            currentDir = targetDir;

            upButton.style.display = currentDir === "./" ? "none" : "block";
            header.textContent = (headerText + currentDir).replace(".", "");

        } catch (error) {
            console.error("Failed to fetch items:", error);
            listing.innerHTML = "<li>Error loading items</li>";
        }
    }

    async function getFile(file) {
        try {
            const response = await fetch(`/get-file?path=${currentDir}${file}`);
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = file;
            a.style.display = "none";
            document.body.appendChild(a);

            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Failed to fetch the file:", error);
        }
    }

    upButton.addEventListener('click', async function () {
        const directories = currentDir.split("/");
        currentDir = directories.slice(0, -2).join("/") + "/";
        await getItems();
    })

    downloadAll.addEventListener('click', function () {
        const fileLinks = document.querySelectorAll('a[data-type="file"]');
        fileLinks.forEach(async link => {
            const fileName = link.textContent;
            await getFile(fileName);
        })
    })

    fileInput.addEventListener('change', async function () {
        const file = fileInput.files[0];
        const formData = new FormData();

        formData.append("file", file);

        const response = await fetch("/", {
            method: 'POST',
            body: formData
        })

        if (response.ok) {
            msg = "File upload successful"
        }
        else {
            msg = "File upload failed"
        }

        alert.textContent = msg;
        alert.classList.add('alert-visible');

        setTimeout(() => {
            alert.classList.remove('alert-visible')
        }, 3000)
    })

    await getItems();
});
