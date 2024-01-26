window.addEventListener('load', () => {
    let footer = document.querySelector("footer");
    let menu = '';

    // There's gotta be a better way to build this lol
    menu += '\n<label id="settings-label" class="icon-checkbox" for="settings-menu-toggle"><i class="icon icon-gear dark"></i></label>';
    menu += '\n<input id="settings-menu-toggle" type="checkbox" />';
    menu += '\n<dialog id="settings-menu" class="rounded shadow">';
    menu += '\n<i class="icon icon-close close-button"></i>';
    menu += '\n<section id="settings-menu-wrapper">';
    menu += '\n<span class="legend">Settings</span>';
    menu += '\n<label for="show-hidden-dirs">Show hidden folders</label>';
    menu += '\n<input id="show-hidden-dirs" type="checkbox" />';
    menu += '\n<label for="show-hidden-files">Show hidden files</label>';
    menu += '\n<input id="show-hidden-files" type="checkbox" />';
    menu += '\n</section>';
    menu += '\n</dialog>';
    footer.innerHTML += menu;
    directories = document.querySelectorAll('.hidden-dir');
    settingsMenu = document.getElementById('settings-menu');
    closeButton = settingsMenu.querySelector('.icon-close');

    closeButton.addEventListener('click', () => {
        settingsMenu.close();
    });

    settingsToggle = document.getElementById('settings-menu-toggle');
    settingsToggle.addEventListener('click', (e) => {
        console.log(settingsMenu.getAttribute('open'));
        if (settingsMenu.getAttribute('open') == null) {
            settingsMenu.showModal();
        } else {
            settingsMenu.close();
        }
    });

    showHidden = document.getElementById('show-hidden-dirs');
    showHidden.addEventListener('change', () => {
        // fucking javascript LMAO!
        setHiddenDirs(showHidden.checked.toString());
    });
    
    loadHiddenState();
});

function loadHiddenState() {
    let hiddenDirsVisible = localStorage.getItem('hiddenDirsVisible');

    showHidden.checked = hiddenDirsVisible === 'true';
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