import {ipcRenderer} from 'electron';
import {hideInstallStep, showFinalStep} from "./steps";
import * as path from 'path';

export function initInstallStep() {
    window.addEventListener('DOMContentLoaded', () => {
        const installPathInput = document.getElementById('installPath') as HTMLInputElement;
        const progressBar = document.getElementById('progressBar') as HTMLDivElement;
        const statusText = document.getElementById('statusText') as HTMLDivElement;

        installPathInput.addEventListener('input', (e) => {
            setTimeout(() => {
                installPathInput.classList.remove('input-error');
            }, 150);
        });

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
            }
        });
    });
}

export async function selectFolder() {
    const folder = await ipcRenderer.invoke('open-folder-dialog');
    if (path) {
        const pathInput = document.getElementById('installPath') as HTMLInputElement;
        pathInput.value = folder;
        pathInput.classList.remove('input-error');
    }
}

export async function handleInstall(): Promise<void> {
    const pathInput = document.getElementById('installPath') as HTMLInputElement;
    const folder = pathInput.value.trim();

    pathInput.classList.remove('input-error');

    if (!folder) {
        pathInput.classList.add('input-error');
        pathInput.focus();
        return;
    }

    const isValidPath = await ipcRenderer.invoke('validate-path', folder);
    if (!isValidPath) {
        pathInput.classList.add('input-error');
        pathInput.focus();
        return;
    }

    const installButton = document.getElementById('install-button') as HTMLButtonElement;
    installButton.disabled = true;

    const progressWrapper = document.getElementById('progressWrapper')!;
    progressWrapper.classList.remove('d-none');

    const zipUrl = 'https://www.darkparadise.eu/soubory/Dark%20Paradise.zip';
    const success = await ipcRenderer.invoke('download-and-unzip', zipUrl, folder);
    if (success) {
        const normalizedPath = folder.replace(/\\/g, '/'); // windows format
        await setOrionLauncherGamePaths(normalizedPath);
        await setOrionAssistScriptsPath(normalizedPath);
        await ipcRenderer.invoke('create-shortcuts', normalizedPath);
        setTimeout(() => {
            const progressWrapper = document.getElementById('progressWrapper')!;
            progressWrapper.classList.add('d-none');
            hideInstallStep();
            showFinalStep();
        }, 3000);
    }
}

async function setOrionLauncherGamePaths(folder: string) {
    const uoPath = `${folder}/Ultima Online DP`;
    const orionPath = `${uoPath}/Orion Launcher`;
    const profilesXmlPath = path.join(orionPath, 'Config', 'profiles.xml')
    const configXmlPath = path.join(orionPath, 'Config', 'config.xml')

    const dataProfiles = await ipcRenderer.invoke('read-file', profilesXmlPath);
    const updatedDataProfiles = dataProfiles
        .replace(/uo_path="[^"]*"/, `uo_path="${uoPath}"`)
        .replace(/orion_path="[^"]*"/, `orion_path="${orionPath}"`);

    await ipcRenderer.invoke('save-file', profilesXmlPath, updatedDataProfiles);

    const dataConfig = await ipcRenderer.invoke('read-file', configXmlPath);
    const updatedDataConfig = dataConfig
        .replace(/<orionpath path="[^"]*"/, `<orionpath path="${orionPath}"`)
        .replace(/<uopath path="[^"]*"/, `<uopath path="${uoPath}"`);
    await ipcRenderer.invoke('save-file', configXmlPath, updatedDataConfig);
}

async function setOrionAssistScriptsPath(folder: string) {
    const scriptPath = `${folder}/Ultima Online DP/Orion Launcher/OA/Autoload.oajs`;
    const optionsXml = `${folder}/Ultima Online DP/Orion Launcher/OA/Config/Default/Options.xml`;

    const data = await ipcRenderer.invoke('read-file', optionsXml);
    const updatedData = data.replace(/scriptfile="[^"]*"/, `scriptfile="${scriptPath}"`);
    await ipcRenderer.invoke('save-file', optionsXml, updatedData);
}