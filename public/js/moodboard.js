// Image and video viewer
let modal = document.getElementById('modal');
let originalTitle = document.title;
let currentItemIndex = 0;
let moodboardItems = document.querySelectorAll('[index]');

function getCleanFileName(filePath) {
    let pathSegments = filePath.split('/');
    let fileName = decodeURIComponent(pathSegments.pop());
    return fileName;
};

function openImage(img) {
    modal.classList.remove('hidden');
    let clone = img.cloneNode(true);
    clone.setAttribute('id', 'modal-image');
    modal.appendChild(clone);
    currentItemIndex = parseInt(img.getAttribute('index'));
};

function openVideo(video) {
    modal.classList.remove('hidden');
    let clone = video.cloneNode(true);
    clone.setAttribute('id', 'modal-video');
    clone.setAttribute('autoplay', 'true');
    clone.setAttribute('loop', 'true');
    clone.setAttribute('controls', '');
    clone.removeAttribute('onclick');
    modal.appendChild(clone);
    document.title = getCleanFileName(video.children[0].src);
    currentItemIndex = parseInt(video.getAttribute('index'));
};

// Hide the modal
window.onclick = function(event) {
    if (event.target === modal) {
        let modalImage = document.getElementById('modal-image');
        let modalVideo = document.getElementById('modal-video');
        modal.classList.add('hidden');

        if (modalImage != null)
            modal.removeChild(modalImage);
        if (modalVideo != null)
            modal.removeChild(modalVideo);
        document.title = originalTitle;
    }
};

// Image navigation with arrow keys
function updateModalContent() {
    let newItem = moodboardItems[currentItemIndex];

    modal.innerHTML = '';
    if (newItem.tagName === 'IMG') {
        openImage(newItem);
    } else if (newItem.tagName === 'VIDEO') {
        openVideo(newItem);
    }
};

addEventListener('keydown', (e) => {
    e.preventDefault();
    if (!modal.classList.contains('hidden')) {
        if (e.key === "ArrowLeft") {
            if (currentItemIndex > 0) {
                currentItemIndex--;
                updateModalContent();
            }
        }
        else if (e.key === "ArrowRight") {
            if (currentItemIndex < moodboardItems.length - 1) {
                currentItemIndex++;
                updateModalContent();
            }
        }
        console.log(currentItemIndex);
    }
});

// File uploads
function handleDrop(files) {
    let filesArray = Array.from(files);
    filesArray.forEach(uploadFile);
};

function uploadFile(file) {
    let uploadPath = window.location.pathname.replace('/view', '/upload');

    let formData = new FormData();
    formData.append('file', file);

    fetch(uploadPath, {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log('Upload successful:', data);
        location.reload();
    })
    .catch(error => {
        console.error('Error during upload: ', error);
    });
};

window.onload = () => {
    let moodboard = document.querySelector('.moodboard');

    if (moodboard == null) {
        console.log('moodboard not found!');
        return;
    }

    document.addEventListener('dragover', function (e) {
        e.stopPropagation();
        e.preventDefault();
        document.body.classList.add('dragenter');
    });

    document.addEventListener('dragleave', function (e) {
        e.stopPropagation();
        e.preventDefault();
        document.body.classList.remove('dragenter');
    });

    document.addEventListener('drop', function (e) {
        e.preventDefault();
        handleDrop(e.dataTransfer.files);
        document.body.classList.remove('dragenter');
    });
};

// File deletions
async function deleteFile(button, fileName) {
    let listItem = button.parentNode;
    let userConfirmed = confirm(`Are you sure you want to delete the file '${fileName}'? This CANNOT be undone.`);

    if (userConfirmed) {
        try {
            let response = await fetch(`/delete/${fileName}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            let result = await response.text();
            console.log(result);
            if (result == 'File deleted successfully') {
                listItem.remove();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
};

document.addEventListener('contextmenu', (event) => {
    if (event.target.tagName == 'IMG' && event.target.classList.contains('block-context-menu')) {
        event.preventDefault();
        event.target.parentNode.classList.add('hovered');
    }

    setTimeout(() => {
        event.target.parentNode.classList.remove('hovered');
    }, 2000);
});