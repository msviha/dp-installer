export function hideInstallStep() {
    document.getElementById('install-form')!.style.display = 'none';
    document.getElementById('close-x-button')!.style.display = 'none';
}

export function showFinalStep() {
    document.getElementById('step-final')!.style.display = 'block';
}
