#include <windows.h>
#include <string>
#include <iostream>
#include <shlwapi.h>
#include <csignal>
#include <array>
#include <memory>
#include <locale>
#include <codecvt>

PROCESS_INFORMATION serverProc, edgeProc;

// std::string to std::wstring
std::wstring stringToWstring(const std::string& str) {
    std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
    return converter.from_bytes(str);
}

// get msedge path without cmd window coming up
std::string getPathSilently(const char* command) {
    char buffer[128];
    DWORD bytesRead;
    std::string result;

    SECURITY_ATTRIBUTES sa = { sizeof(SECURITY_ATTRIBUTES), NULL, TRUE };
    HANDLE hReadPipe, hWritePipe;

    if (!CreatePipe(&hReadPipe, &hWritePipe, &sa, 0))
        return "";

    STARTUPINFOA si = { sizeof(si) };
    PROCESS_INFORMATION pi;
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdOutput = hWritePipe;
    si.hStdError = hWritePipe;

    if (!CreateProcessA(
        NULL,
        (LPSTR)command,
        NULL, NULL, TRUE,
        CREATE_NO_WINDOW,
        NULL, NULL, &si, &pi
    )) {
        CloseHandle(hWritePipe);
        CloseHandle(hReadPipe);
        return "";
    }

    CloseHandle(hWritePipe);

    while (ReadFile(hReadPipe, buffer, sizeof(buffer) - 1, &bytesRead, NULL) && bytesRead != 0) {
        buffer[bytesRead] = '\0';
        result += buffer;
    }

    CloseHandle(hReadPipe);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);

    return result;
}

BOOL WINAPI consoleHandler(DWORD signal) {
    if (signal == CTRL_CLOSE_EVENT || signal == CTRL_C_EVENT) {
        TerminateProcess(serverProc.hProcess, 0);
        TerminateProcess(edgeProc.hProcess, 0);
        CloseHandle(serverProc.hProcess);
        CloseHandle(serverProc.hThread);
        CloseHandle(edgeProc.hProcess);
        CloseHandle(edgeProc.hThread);
        exit(0);
    }
    return TRUE;
}

bool runProcess(const std::wstring& command, PROCESS_INFORMATION& procInfo, bool showWindow) {
    STARTUPINFOW si = { sizeof(si) };
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = showWindow ? SW_SHOW : SW_HIDE;

    ZeroMemory(&procInfo, sizeof(procInfo));

    return CreateProcessW(
        NULL,
        (LPWSTR)command.c_str(),
        NULL, NULL, TRUE,
        showWindow ? 0 : CREATE_NO_WINDOW,
        NULL, NULL, &si, &procInfo
    );
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    SetConsoleCtrlHandler(consoleHandler, TRUE);

    // Start Node.js in the background
    if (!runProcess(L"node.exe server.js", serverProc, false)) {
        std::cerr << "Error al iniciar Node.js\n";
        return 1;
    }
    
    const char* msedgCommand = "cmd /c for /f \"tokens=3*\" %A in ('reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe\" /ve') do @echo %A %B";
    std::string msdgePathRaw = getPathSilently(msedgCommand);
    msdgePathRaw.erase(msdgePathRaw.find_last_not_of(" \n\r\t") + 1);

    if (msdgePathRaw.empty()) {
        msdgePathRaw = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    }

    std::wstring msdgePath = stringToWstring(msdgePathRaw);

    // Start Edge as an "app"
    wchar_t hostname[MAX_PATH];
    DWORD size = MAX_PATH;
    GetComputerNameW(hostname, &size);

    std::wstring edgeCommand = L"\"" + msdgePath + L"\" --new-window --app=http://";
    edgeCommand += hostname;
    edgeCommand += L":80 --start-maximized --force-dark-mode";

    if (!runProcess(edgeCommand, edgeProc, true)) {
        TerminateProcess(serverProc.hProcess, 0);
        CloseHandle(serverProc.hProcess);
        CloseHandle(serverProc.hThread);
        return 1;
    }

    // Wait until Edge closes
    WaitForSingleObject(edgeProc.hProcess, INFINITE);

    // Kill Node.js process
    TerminateProcess(serverProc.hProcess, 0);
    CloseHandle(serverProc.hProcess);
    CloseHandle(serverProc.hThread);
    CloseHandle(edgeProc.hProcess);
    CloseHandle(edgeProc.hThread);

    return 0;
}