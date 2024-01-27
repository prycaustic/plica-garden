
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
    directories = document.querySelectorAll('.hidden-dir');
    settingsMenu = document.getElementById('settings-dialog');
    closeButton = settingsMenu.querySelector('.icon-close');

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