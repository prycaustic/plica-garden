window.addEventListener('load', () => {
    let footer = document.querySelector("footer");
    let menu = '';

    // There's gotta be a better way to build this lol
    menu += '\n<label id="settings-label" class="icon-checkbox" for="settings-menu-toggle"><i class="icon icon-gear dark"></i></label>';
    menu += '\n<input id="settings-menu-toggle" type="checkbox" />';
    menu += '\n<fieldset id="settings-menu" class="rounded shadow">';
    menu += '\n<span class="legend">Settings</span>';
    menu += '\n<label for="show-hidden-dirs">Show hidden folders</label>';
    menu += '\n<input id="show-hidden-dirs" type="checkbox" />';
    menu += '\n</fieldset>';
    footer.innerHTML += menu;
    directories = document.querySelectorAll('.hidden-dir');
    checkbox = document.querySelector('#show-hidden-dirs');

    checkbox.addEventListener('change', () => {
        // fucking javascript LMAO!
        setHiddenDirs(checkbox.checked.toString());
    });
    
    loadHiddenState();
});

function loadHiddenState() {
    let hiddenDirsVisible = localStorage.getItem('hiddenDirsVisible');

    checkbox.checked = hiddenDirsVisible;
    setHiddenDirs(hiddenDirsVisible);
}

function setHiddenDirs(value) {
    if (value === 'true') {
        directories.forEach((element) => {
            element.classList.remove('hidden');
        });
    } else if (value === 'false') {
        directories.forEach((element) => {
            element.classList.add('hidden');
        });
    }

    localStorage.setItem('hiddenDirsVisible', value);
};