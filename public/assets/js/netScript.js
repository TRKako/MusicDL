let hasLostConnection = false;

async function checkInternet() {
    try {
        const response = await fetch('/check-internet');
        const data = await response.json();
        return data.online;
    } catch {
        return false;
    }
}

async function updateConnectionStatus() {
    const isConnected = await checkInternet();

    if (isConnected) {
        if (hasLostConnection) {
            showToast('wifiRestoredToast');
            document.getElementById("query").disabled = false;
            document.getElementById("searchBtn").disabled = false;
            document.getElementById("searchBtn").style.backgroundColor = "#007bff";
            document.getElementById("searchBtn").style.cursor = "default";
            document.getElementById("query").style.cursor = "text";
            hasLostConnection = false;
        }
    } else {
        if (!hasLostConnection) {
            showToast('noWifiToast');
            document.getElementById("query").disabled = true;
            document.getElementById("searchBtn").disabled = true;
            document.getElementById("searchBtn").style.backgroundColor = "#004da0";
            document.getElementById("searchBtn").style.cursor = "not-allowed";
            document.getElementById("query").style.cursor = "not-allowed";
            hasLostConnection = true;
        }
    }
}

function showToast(toastId) {
    const toastElement = document.getElementById(toastId);
    const toastInstance = new bootstrap.Toast(toastElement);
    toastInstance.show();
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateConnectionStatus, 1500);

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);

    setInterval(updateConnectionStatus, 5000);
});