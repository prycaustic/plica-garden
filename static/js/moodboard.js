// Image and video viewer
let modal = document.getElementById('modal');
let modalInfo = document.getElementById('modal-info');
let uploadModal = document.getElementById('file-upload-modal');
let originalTitle = document.title;
let currentItemIndex = 0;
let moodboardItems = document.querySelectorAll('[index]');
let swipeThreshold = 75;

function getCleanFileName(filePath) {
    let pathSegments = filePath.split('/');
    let fileName = decodeURIComponent(pathSegments.pop());
    return fileName;
};

function openImage(link) {
    currentItemIndex = parseInt(link.getAttribute('index'));

    let image = document.createElement('img');
    image.setAttribute('id', 'modal-image');
    image.setAttribute('src', link.href);
    
    modal.insertBefore(image, modal.firstChild);
    modalInfo.innerText = getCleanFileName(link.href);
    document.body.style.overflow = 'hidden';
};

function openVideo(link) {
    currentItemIndex = parseInt(link.getAttribute('index'));

    let video = document.createElement('video');
    video.setAttribute('id', 'modal-video');
    video.setAttribute('autoplay', 'true');
    video.setAttribute('loop', 'true');
    video.setAttribute('controls', 'true');
    video.src = link.href;

    modal.insertBefore(video, modal.firstChild);
    modalInfo.innerText = getCleanFileName(link.href);
    document.body.style.overflow = 'hidden';
};

document.querySelectorAll('.image-link').forEach((element) => {
    element.addEventListener('click', (event) => {
        event.preventDefault();
        openImage(element);
        animateModal('opening');
    });
});

document.querySelectorAll('.video-link').forEach((element) => {
    element.addEventListener('click', (event) => {
        event.preventDefault();
        openVideo(element);
        animateModal('opening');
    });
});

// Hide the modal
function clearModalContents() {
    let modalImage = document.getElementById('modal-image');
    let modalVideo = document.getElementById('modal-video');

    if (modalImage != null)
        modal.removeChild(modalImage);
    if (modalVideo != null)
        modal.removeChild(modalVideo);

    document.body.style.overflow = 'initial';
}

function animateModal(animation) {
    modal.showModal();
    document.title = originalTitle;
    modal.setAttribute(animation, '');
    
    modal.addEventListener('animationend', () => {
        modal.removeAttribute(animation);
        if (animation == 'closing') {
            modal.close();
            clearModalContents();
        }
    }, {once: true});
}

function animateModalContents(animation) {
    let contents = modal.firstChild;

    contents.setAttribute(animation, '');
    contents.addEventListener('animationend', () => {
        contents.removeAttribute(animation);
    }, {once: true});
}

window.onclick = function(event) {
    if (event.target === modal) {
        animateModal('closing');
    }
};

// Image navigation with arrow keys
function updateModalContent() {
    let newItem = moodboardItems[currentItemIndex];
    
    clearModalContents();
    if (newItem.classList.contains('image-link')) {
        openImage(newItem);
    } else if (newItem.classList.contains('video-link')) {
        openVideo(newItem);
    }
};

function showPreviousItem() {
    if (currentItemIndex > 0) {
        currentItemIndex--;
        updateModalContent();
    } else {
        animateModalContents('shaking');
    }
}

function showNextItem() {
    if (currentItemIndex < moodboardItems.length - 1) {
        currentItemIndex++;
        updateModalContent();
    } else {
        animateModalContents('shaking');
    }
}

addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;
    let contents = modal.firstChild;
    prevVolume = 1;

    // Modal controls
    if (document.fullscreenElement == contents) {
        if (e.key == 'f')
            document.exitFullscreen();
        if (contents.nodeName == 'IMG')
            handleFullscreenImage();
        if (contents.nodeName == 'VIDEO')
            handleFullscreenVideo(contents, e.key);
    } else {
        switch (e.key) {
            case 'f':
                contents.requestFullscreen();
                break;
            case 'ArrowLeft':
                showPreviousItem();
                break;
            case 'ArrowRight':
                showNextItem();
                break;
        }
    }
});

function handleFullscreenImage(image, input) {
    // Not implemented yet
}

function handleFullscreenVideo(video, input) {
    switch (input) {
        case 'j':
            video.currentTime -= 10;
            break;
        case 'k':
            if (video.paused)
                video.play();
            else
                video.pause();
            break;
        case 'l':
            video.currentTime += 10;
        case 'ArrowLeft':
            video.currentTime -= 5;
            break;
        case 'ArrowRight':
            video.currentTime += 5;
            break;
        case 'm':
            if (video.muted) {
                video.muted = false;
                video.volume = prevVolume
            } else {
                prevVolume = video.volume;
                video.muted = true;
            }
            break;
        case 'ArrowUp':
            if (video.muted)
                video.muted = false;
            if (video.volume < 1)
                video.volume += 0.1;
            break;
        case 'ArrowDown':
            console.log(video.volume);
            if (video.volume > 0.05)
                video.volume -= 0.1;
            else
                video.muted = true;
            break;
    }
}

// Swipe controls
document.addEventListener('touchstart', function (e) {
    if (modal.classList.contains('hidden') || e.touches.length > 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    document.body.style.overflow = 'hidden';
});

document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) return;
    let minOpacity = 0.2;
    let currentX = e.touches[0].clientX;
    let deltaX = currentX - startX;
    let currentY = e.touches[0].clientY;
    let deltaY = currentY - startY;

    let opacity = 1 - Math.abs(deltaY) / (swipeThreshold * 4);
    opacity = Math.max(minOpacity, Math.min(1, opacity));

    modal.firstChild.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    modal.firstChild.style.opacity = opacity;
});

document.addEventListener('touchend', function (e) {
    if (modal.classList.contains('hidden') || e.changedTouches.length > 1) return;
    let endX = e.changedTouches[0].clientX;
    let endY = e.changedTouches[0].clientY;
    let deltaX = endX - startX;
    let deltaY = endY - startY;

    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
        // Check which direction has a greater movement and trigger the corresponding action
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > swipeThreshold) {
                showPreviousItem();
            } else if (deltaX < -swipeThreshold) {
                showNextItem();
            }
        } else {
            hideModal();
            return;
        }
    }

    modal.firstChild.style.transform = 'translateX(0px)';
    modal.firstChild.style.opacity = 1;
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
    .then(response => {
        if (!response.ok)
            throw new Error('Network response was not OK');
        response.json();
    })
    .then(data => {
        console.log('Upload successful:', data);
        location.reload();
    })
    .catch(error => {
        console.error('Error during upload: ', error);
    });
};

// File deletions
async function deleteFile(contentPath) {
    let listItem = document.querySelector(`[href='${contentPath}']`).parentNode;
    let fileName = contentPath.replace('/content', '/delete');

    try {
        let response = await fetch(`${fileName}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        let result = await response.text();
        if (result == 'File deleted successfully') {
            listItem.remove();
        }
    } catch (error) {
        console.error('Error:', error);
    }
};

// File editing menu
function editFile(contentPath) {
    // Show edit dialog menu
    let editDialog = document.getElementById('file-edit-dialog');
    editDialog.showModal();

    let deleteButton = document.getElementById('file-delete');
    deleteButton.onclick = (e) => {
        e.preventDefault();
        deleteFile(contentPath);
        editDialog.close();
    };

    // Populate the form with the current file name
    let editName = document.getElementById('file-edit-name');
    // Get the file name from the URL
    let fileName = contentPath.split('/').pop();
    fileName = fileName.split('.').slice(0, -1).join('.');
    editName.value = fileName;

    let editForm = document.getElementById('file-edit-form');
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let editPath = contentPath.replace('/content/', '/edit/');
        const formData = new FormData(editForm);

        fetch(editPath, {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok)
                throw new Error('Network response was not OK');
            location.reload();
        })
        .catch(error => {
            console.error('Error during edit: ', error);
        });
    });
}

window.addEventListener('load', () => {
    let moodboard = document.querySelector('#moodboard');

    if (moodboard == null) {
        console.log('moodboard not found!');
        return;
    }

    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadModal.showModal();
    });

    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadModal.close();
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        handleDrop(e.dataTransfer.files);
        uploadModal.close();
    });

    let uploadInput = document.querySelector('#moodboard-upload');
    uploadInput.addEventListener('change', () => {
        for (let file of uploadInput.files) {
            uploadFile(file);
        }
    });
});

document.addEventListener('contextmenu', (event) => {
    if (event.target.tagName == 'IMG' && event.target.classList.contains('block-context-menu')) {
        event.preventDefault();
        event.target.parentNode.classList.add('hovered');
    }

    setTimeout(() => {
        event.target.parentNode.classList.remove('hovered');
    }, 2000);
});