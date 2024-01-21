window.addEventListener('load', () => {
    let nav = document.querySelector("nav");

    nav.innerHTML += '<span id="toggle-dirs" class="icon material-symbols-sharp small dark" onclick="toggleHiddenDirs()" title="Enable hidden folders">visibility_off</span>';
    directories = document.querySelectorAll('.hidden-dir');
    icon = document.querySelector('#toggle-dirs');
    
    loadHiddenState();
});

function toggleHiddenDirs() {
    directories.forEach((element) => {
        if (element.classList.contains('hidden')) {
            // Hidden dirs are VISIBLE
            element.classList.remove('hidden');
            localStorage.setItem('hiddenDirsVisible', 'true');
            icon.innerText = 'visibility';
            icon.title = 'Disable hidden folders';
        }
        else {
            // Hidden dirs are NOT VISIBLE
            element.classList.add('hidden');
            localStorage.setItem('hiddenDirsVisible', 'false');
            icon.innerText = 'visibility_off';
            icon.title = 'Enable hidden folders';
        }
    });
};

function loadHiddenState() {
    let hiddenDirsVisible = localStorage.getItem('hiddenDirsVisible');

    if (hiddenDirsVisible === 'true') {
        icon.title = 'Disable hidden folders';
        icon.innerText = 'visibility';
        directories.forEach((element) => {
            element.classList.remove('hidden');
        });
    }
}