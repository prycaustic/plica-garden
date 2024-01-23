// Image and video viewer
let modal = document.getElementById('modal');
let modalInfo = document.getElementById('modal-info');
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
    modal.classList.remove('hidden');
    document.title = originalTitle;
    modal.setAttribute(animation, '');
    
    modal.addEventListener('animationend', () => {
        modal.removeAttribute(animation);
        if (animation == 'closing') {
            modal.classList.add('hidden');
            clearModalContents();
        }
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
    }
}

function showNextItem() {
    if (currentItemIndex < moodboardItems.length - 1) {
        currentItemIndex++;
        updateModalContent();
    }
}

addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;
    let contents = modal.firstChild;
    let prevVolume = 1;

    // Modal controls
    if (document.fullscreenElement != contents) {
        switch (e.key) {
            case 'ArrowLeft':
                showPreviousItem();
                break;
            case 'ArrowRight':
                showNextItem();
                break;
        }
    }

    // Video controls
    if (contents.nodeName === "VIDEO") {
        switch (e.key) {
            case 'f':
                contents.requestFullscreen();
                break;
            case 'j':
                contents.currentTime -= 10;
                break;
            case 'k':
                if (contents.paused)
                    contents.play();
                else
                    contents.pause();
                break;
            case 'l':
                contents.currentTime += 10;
            case 'ArrowLeft':
                contents.currentTime -= 5;
                break;
            case 'ArrowRight':
                contents.currentTime += 5;
                break;
            case 'm':
                if (contents.muted) {
                    contents.muted = false;
                    contents.volume = prevVolume
                } else {
                    prevVolume = contents.volume;
                    contents.muted = true;
                }
                break;
            case 'ArrowUp':
                if (contents.muted)
                    contents.muted = false;
                if (contents.volume < 1)
                    contents.volume += 0.1;
                break;
            case 'ArrowDown':
                console.log(contents.volume);
                if (contents.volume > 0.05)
                    contents.volume -= 0.1;
                else
                    contents.muted = true;
                break;
            default:
                return;
        }
    }
    e.preventDefault();
});

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
async function deleteFile(button, contentPath) {
    let listItem = button.parentNode;
    let fileName = contentPath.replace('/content', '');
    let userConfirmed = confirm(`Are you sure you want to delete the file '${fileName}'? This CANNOT be undone.`);

    if (userConfirmed) {
        try {
            let response = await fetch(`/delete${fileName}`, {
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
    }
};

window.addEventListener('load', () => {
    let moodboard = document.querySelector('#moodboard');

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