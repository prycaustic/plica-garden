function handleDrop(files) {
    let filesArray = Array.from(files);
    filesArray.forEach(uploadFile);
}

function uploadFile(file) {
    let urlParts = window.location.pathname.split('/').filter(Boolean);
    let uploadPath = '/upload/' + urlParts.join('/') + '/';

    let formData = new FormData();
    formData.append('file', file);

    fetch('uploadPath', {
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
    let modal = document.getElementById("modal");
    let uploadIcon = document.querySelector('.upload-icon');
    if (moodboard == null) {
        console.log("moodboard not found!");
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