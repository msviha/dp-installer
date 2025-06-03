import {app, BrowserWindow, ipcMain, dialog} from 'electron';
import * as https from 'https';
import * as fs from 'fs';

const createDesktopShortcut = require('create-desktop-shortcuts');
import * as path from 'path';
import extract from 'extract-zip';

let mainWindow: BrowserWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'renderer.js'),
            contextIsolation: false,
            nodeIntegration: true
        }
    });

    mainWindow.loadFile(path.join(__dirname, './app/index.html'));
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

ipcMain.on('close-app', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.handle('open-folder-dialog', async () => {
    const {canceled, filePaths}: any = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()!, {
        properties: ['openDirectory']
    });

    return canceled || filePaths.length === 0 ? '' : filePaths[0];
});

ipcMain.handle('validate-path', async (_event, path: string) => {
    return fs.existsSync(path);
});

ipcMain.handle('download-and-unzip', async (event, zipUrl: string, targetDir: string) => {
    const tempZipPath = path.join(app.getPath('temp'), 'game_temp.zip');

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(tempZipPath);

        https.get(zipUrl, response => {
            if (response.statusCode !== 200) {
                reject(`HTTP ${response.statusCode}`);
                return;
            }

            const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
            let downloadedBytes = 0;

            response.on('data', chunk => {
                downloadedBytes += chunk.length;
                const percent = totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
                if (!mainWindow?.isDestroyed()) {
                    mainWindow.webContents.send('download-progress', percent);
                }
            });

            response.pipe(file);

            file.on('finish', async () => {
                if (!mainWindow?.isDestroyed()) {
                    mainWindow.webContents.send('status', 'Rozbaluji...');
                }

                file.close();

                try {
                    await extract(tempZipPath, {dir: targetDir});
                    fs.unlinkSync(tempZipPath);
                    mainWindow.webContents.send('status', 'Hotovo.');
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', err => {
            fs.unlinkSync(tempZipPath);
            reject(err.message);
        });
    });
});

ipcMain.handle('read-file', async (event, path: string) => {
    return fs.readFileSync(path, 'utf8');
});

ipcMain.handle('save-file', (event, path: string, content: string): void => {
    fs.writeFileSync(path, content, 'utf8');
})

ipcMain.handle('create-shortcuts', async (event, folder: string) => {
    const orionExePath = path.join(folder, 'Ultima Online DP', 'Orion Launcher', 'OrionLauncher64.exe');
    createDesktopShortcut({
        windows: {
            filePath: orionExePath,
            name: 'Orion Launcher (DP)',
            comment: 'Spustit Dark Paradise přes Orion Launcher',
            icon: orionExePath,
            workingDirectory: path.dirname(orionExePath),
        }
    });
    const uoamExePath = path.join(folder, 'Ultima Online DP', 'uoam_Orion.exe');
    createDesktopShortcut({
        windows: {
            filePath: uoamExePath,
            name: 'UOAM (DP)',
            comment: 'Spustit UOAM pro Orion',
            args: ['-q'],
            icon: uoamExePath,
            workingDirectory: path.dirname(uoamExePath),
        }
    });
});