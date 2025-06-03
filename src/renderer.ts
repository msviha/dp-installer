import {ipcRenderer} from 'electron';
import {initInstallStep, handleInstall, selectFolder} from './install-step';
import {showFinalStep} from "./steps";

(window as any).closeApp = () => ipcRenderer.send('close-app');

// init
initInstallStep();

// template binding
(window as any).selectFolder = selectFolder;
(window as any).install = handleInstall;
(window as any).showFinalStep = showFinalStep;
