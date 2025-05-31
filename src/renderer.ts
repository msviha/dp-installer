import {ipcRenderer} from 'electron';

(window as any).closeApp = () => {
    console.log("Close clicked");
    ipcRenderer.send('close-app');
};

(window as any).selectFolder = () => {
    ipcRenderer.invoke('open-folder-dialog').then((path: string) => {
        if (path) {
            (document.getElementById('installPath') as HTMLInputElement).value = path;
        }
    });
};

(window as any).install = async () => {
    const pathInput = document.getElementById('installPath') as HTMLInputElement;
    const username = (document.getElementById('username') as HTMLInputElement).value.trim();
    const path = pathInput.value.trim();

    pathInput.classList.remove('input-error');

    if (!path) {
        pathInput.classList.add('input-error');
        pathInput.focus();
        return;
    }

    // ✅ OPRAVA ZDE:
    const isValidPath = await ipcRenderer.invoke('validate-path', path);

    if (!isValidPath) {
        pathInput.classList.add('input-error');
        pathInput.focus();
        return;
    }

    const progressWrapper = document.getElementById('progressWrapper')!;
    progressWrapper.classList.remove('d-none');

    console.log('Instaluji do:', path, 'Uživatel:', username);
    const zipUrl = 'https://www.darkparadise.eu/soubory/Dark%20Paradise.zip'; // nahraď svou URL
    const success = await ipcRenderer.invoke('download-and-unzip', zipUrl, path);

    if (success) {
        console.log('Hra stažena a rozbalena!');
    } else {
        console.log('Něco se nepovedlo.');
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('progressBar') as HTMLDivElement | null;
    const statusText = document.getElementById('statusText') as HTMLDivElement | null;

    if (!progressBar || !statusText) {
        console.error('Progress bar nebo statusText nebyl nalezen v DOM.');
        return;
    }

    ipcRenderer.on('download-progress', (_event, percent: number) => {
        progressBar.style.width = `${percent}%`;
        progressBar.setAttribute('aria-valuenow', percent.toString());
        progressBar.textContent = `${percent}%`;
        statusText.textContent = 'Stahuji...';
    });

    ipcRenderer.on('status', (_event, message: string) => {
        statusText.textContent = message;

        if (message === 'Rozbaluji...') {
            progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
            progressBar.textContent = 'Rozbaluji...';
        }

        if (message === 'Hotovo.') {
            progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
            progressBar.style.width = `100%`;
            progressBar.textContent = `100%`;
            setTimeout(() => {
                const progressWrapper = document.getElementById('progressWrapper')!;
                progressWrapper.classList.add('d-none');
            }, 2000);
        }
    });
});