window.onload = () => {
    let nav = document.querySelector("nav");

    nav.innerHTML += '<span id="toggle-dirs" class="icon material-symbols-sharp small dark" onclick="toggleHiddenDirs(this)" title="Disable hidden folders">visibility_off</span>';
    directories = document.querySelectorAll('.hidden-dir');
    icon = document.querySelector('#toggle-dirs');
    
    loadHiddenState();
};

function toggleHiddenDirs() {
    directories.forEach((element) => {
        if (element.classList.contains('hidden')) {
            localStorage.setItem('hiddenState', 'false');
            icon.title = 'Disable hidden folders';
            icon.innerText = 'visibility_off';
            element.classList.remove('hidden');
        }
        else {
            localStorage.setItem('hiddenState', 'true');
            icon.title = 'Enable hidden folders';
            icon.innerText = 'visibility';
            element.classList.add('hidden');
        }
    });
};

function loadHiddenState() {
    let hiddenState = localStorage.getItem('hiddenState');

    if (hiddenState === 'true') {
        icon.title = 'Enable hidden folders';
        icon.innerText = 'visibility';
        directories.forEach((element) => {
            element.classList.add('hidden');
        });
    }
}