// Image and video viewer
let modal = document.getElementById('modal');
let modalImg = document.getElementById('modal-image');
let originalTitle = document.title;

function getCleanFileName(filePath) {
    const pathSegments = filePath.split('/');
    const fileName = decodeURIComponent(pathSegments.pop());
    return fileName;
  }

function openImage(imgSrc) {
    modal.classList.remove('hidden');
    modalImg.classList.remove('hidden');
    modalImg.src = imgSrc;
};

function openVideo(video) {
    modal.classList.remove('hidden');
    let clone = video.cloneNode(true);
    clone.setAttribute('id', 'modal-video');
    clone.setAttribute('autoplay', 'true');
    clone.setAttribute('loop', 'true');
    clone.setAttribute('controls', '');
    clone.removeAttribute('onclick');
    modalVideo = modal.appendChild(clone);
    document.title = getCleanFileName(video.children[0].src);
};

window.onclick = function(event) {
    if (event.target === modal) {
        modal.classList.add('hidden');
        modalImg.classList.add('hidden');

        let modalVideo = document.getElementById('modal-video');
        if (modalVideo == null) return;
        modal.removeChild(modalVideo);
        document.title = originalTitle;
    }
};

// File uploads
function handleDrop(files) {
    let filesArray = Array.from(files);
    filesArray.forEach(uploadFile);
}

function uploadFile(file) {
    let uploadPath = window.location.pathname.replace('/view', '/upload');
    console.log(uploadPath);

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
}

window.onload = function() {
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
}

// File deletions
async function deleteFile(button, fileName) {
    console.log(button);
    console.log(fileName);
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