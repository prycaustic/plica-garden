function handleDrop(files) {
    let filesArray = Array.from(files);
    filesArray.forEach(uploadFile);
}

function uploadFile(file) {
    let formData = new FormData();
    formData.append('file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log('Upload successful:', data);
    })
    .catch(error => {
        console.error('Error during upload: ', error);
    });
}

window.onload = function() {
    let moodboard = document.querySelector('.moodboard');
    if (moodboard == null) {
        console.log("moodboard not found!");
        return;
    }

    moodboard.addEventListener('dragover', function (e) {
        e.preventDefault();
    });

    document.addEventListener('drop', function (e) {
        e.preventDefault();
        handleDrop(e.dataTransfer.files);
    });
}