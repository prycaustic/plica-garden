
function createSwitch(label, name) {
    let switchTemplate = '\n<label for="{{name}}" class="switch">{{label}}'
                        + '\n<input id="{{name}}" type="checkbox" />'
                        + '\n<span class="slider"></span></label>';
    switchTemplate = switchTemplate.replace('{{label}}', label);
    switchTemplate = switchTemplate.replaceAll('{{name}}', name);
    return switchTemplate;
}

function closeDialog() {
    // Close any open dialogs
    let openDialogs = document.querySelectorAll('dialog[open]');
    openDialogs.forEach((dialog) => {
        dialog.close();
    });
}

window.addEventListener('load', () => {
    let footer = document.querySelector("footer");
    let menu = '';

    // There's gotta be a better way to build this lol
    menu += '\n<label id="settings-label" class="icon-checkbox" for="settings-menu-toggle"><i class="icon icon-gear dark"></i></label>';
    menu += '\n<input id="settings-menu-toggle" type="checkbox" />';
    menu += '\n<dialog id="settings-menu" class="rounded shadow">';
    menu += '\n<i class="icon icon-close close-button" onclick="closeDialog()"></i>';
    menu += '\n<section id="settings-menu-wrapper">';
    menu += '\n<span class="legend">Settings</span>';
    menu += createSwitch('Show hidden folders', 'show-hidden-dirs');
    menu += createSwitch('Show hidden files', 'show-hidden-files');
    menu += '\n</section>';
    menu += '\n</dialog>';
    footer.innerHTML += menu;
    directories = document.querySelectorAll('.hidden-dir');
    settingsMenu = document.getElementById('settings-menu');
    closeButton = settingsMenu.querySelector('.icon-close');

    closeButton.addEventListener('click', () => {
        ;
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