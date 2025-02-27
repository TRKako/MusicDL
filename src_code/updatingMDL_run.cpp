#include <windows.h>
#include <string>
#include <iostream>
#include <vector>
#include <memory>
#include <gdiplus.h>  // Añadido para soporte de PNG

#pragma comment(lib, "gdiplus.lib")  // Enlazar con la biblioteca GDI+
#pragma comment(linker, "/SUBSYSTEM:WINDOWS /ENTRY:wWinMainCRTStartup")

HWND hwnd;
std::wstring textPrimary = L"Actualizando MusicDL...";
std::wstring textSecondary = L"";
int retryCount = 1;
bool showClosingMessage = false;
HBITMAP hBitmap = NULL;  // Handle para la imagen
Gdiplus::GdiplusStartupInput gdiplusStartupInput;
ULONG_PTR gdiplusToken;

LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
void UpdatePrimaryText(const std::wstring& newText);
void UpdateSecondaryText(const std::wstring& newText);
void CheckOutputAndHandleCompletion(const std::string& output);
void StartNodeProcess();
bool shouldClose();
HBITMAP LoadPNGResource(const wchar_t* imagePath);

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPWSTR lpCmdLine, int nCmdShow) {
    FreeConsole();

    // Inicializar GDI+
    Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, NULL);

    const wchar_t CLASS_NAME[] = L"MusicDLUpdater";

    WNDCLASS wc = {};
    wc.lpfnWndProc = WindowProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hbrBackground = CreateSolidBrush(RGB(19, 19, 18));
    wc.style = CS_HREDRAW | CS_VREDRAW;

    RegisterClass(&wc);

    hwnd = CreateWindowEx(
        WS_EX_LAYERED,
        CLASS_NAME,
        L"MusicDL Updater",
        WS_POPUP,
        CW_USEDEFAULT, CW_USEDEFAULT, 500, 300,
        NULL, NULL, hInstance, NULL
    );

    RECT rc;
    GetWindowRect(hwnd, &rc);
    SetWindowPos(hwnd, NULL, 
        (GetSystemMetrics(SM_CXSCREEN) - rc.right) / 2,
        (GetSystemMetrics(SM_CYSCREEN) - rc.bottom) / 2,
        0, 0, SWP_NOZORDER | SWP_NOSIZE);

    SetLayeredWindowAttributes(hwnd, 0, 255, LWA_ALPHA);
    
    // Cargar la imagen como PNG
    hBitmap = LoadPNGResource(L".\\server\\bin\\MusicDLICO.png");
    
    // Si no se puede cargar, intentar con ruta absoluta o relativa
    if (!hBitmap) {
        // Intentar con ruta relativa al directorio actual
        wchar_t currentDir[MAX_PATH];
        GetCurrentDirectory(MAX_PATH, currentDir);
        std::wstring fullPath = std::wstring(currentDir) + L"\\MusicDLICO.png";
        hBitmap = LoadPNGResource(fullPath.c_str());
        
        // Si aún falla, intentar como ICO
        if (!hBitmap) {
            hBitmap = (HBITMAP)LoadImage(
                NULL, L"MusicDLICO.ico", IMAGE_ICON, 
                64, 64,  // Tamaño fijo para el icono
                LR_LOADFROMFILE
            );
        }
    }
    
    ShowWindow(hwnd, SW_SHOW);

    CreateThread(NULL, 0, [](LPVOID) -> DWORD {
        StartNodeProcess();
        return 0;
    }, NULL, 0, NULL);

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    // Liberar recursos
    if (hBitmap) DeleteObject(hBitmap);
    Gdiplus::GdiplusShutdown(gdiplusToken);
    
    return 0;
}

// Función para cargar específicamente PNG usando GDI+
HBITMAP LoadPNGResource(const wchar_t* imagePath) {
    HBITMAP hBitmap = NULL;
    
    // Cargar la imagen usando GDI+
    Gdiplus::Bitmap* bitmap = Gdiplus::Bitmap::FromFile(imagePath);
    if (bitmap) {
        bitmap->GetHBITMAP(Gdiplus::Color(0, 0, 0, 0), &hBitmap);
        delete bitmap;
    }
    
    return hBitmap;
}

bool shouldClose() {
    if (showClosingMessage) {
        UpdatePrimaryText(L"Abriendo MusicDL");
        UpdateSecondaryText(L"");
        Sleep(1500);
        ShellExecute(NULL, L"open", L"MusicDL.exe", NULL, NULL, SW_SHOWNORMAL);
        Sleep(1500);  
        PostMessage(hwnd, WM_CLOSE, 0, 0);
        showClosingMessage = true;
        return true;
    }
    return false;
}

void StartNodeProcess() {
    SECURITY_ATTRIBUTES sa = { sizeof(SECURITY_ATTRIBUTES), NULL, TRUE };
    HANDLE hRead, hWrite;
    CreatePipe(&hRead, &hWrite, &sa, 0);
    SetHandleInformation(hRead, HANDLE_FLAG_INHERIT, 0);

    PROCESS_INFORMATION pi;
    STARTUPINFO si = { sizeof(STARTUPINFO) };
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdOutput = hWrite;
    si.hStdError = hWrite;

    wchar_t cmd[] = L"node .\\server\\bin\\checkUpdate.js";
    if (!CreateProcess(NULL, cmd, NULL, NULL, TRUE, CREATE_NO_WINDOW, NULL, NULL, &si, &pi)) {
        CloseHandle(hRead);
        CloseHandle(hWrite);
        return;
    }

    CloseHandle(hWrite);
    
    char buffer[4096];
    DWORD bytesRead;
    std::string remaining;
    
    while (ReadFile(hRead, buffer, sizeof(buffer) - 1, &bytesRead, NULL) && bytesRead > 0) {
        buffer[bytesRead] = '\0';
        std::string output = remaining + buffer;
        remaining.clear();

        size_t pos;
        while ((pos = output.find('\n')) != std::string::npos) {
            std::string line = output.substr(0, pos);
            output.erase(0, pos + 1);
            
            std::wstring wline(line.begin(), line.end());
            UpdateSecondaryText(wline);
            CheckOutputAndHandleCompletion(line);
            
            if (shouldClose()) break;
        }
        
        if (!output.empty()) remaining = output;
        if (shouldClose()) break;
    }

    CloseHandle(hRead);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
}

void CheckOutputAndHandleCompletion(const std::string& output) {
    if (output.find("Todos los archivos ya estaban actualizados.") != std::string::npos) {
        showClosingMessage = true;
        
    } else if(output.find("Actualizacion completada.") != std::string::npos){
        showClosingMessage = true;

    } else if(output.find("Sin cambios.") != std::string::npos){
        showClosingMessage = true;

    } else if (output.find("Error al actualizar:") != std::string::npos) {
        if (retryCount < 3) {
            retryCount++;
            UpdatePrimaryText(L"Reintentando actualizar... (" + std::to_wstring(retryCount) + L")");
            Sleep(1500);
            StartNodeProcess();
        } else {
            showClosingMessage = true;
        }
    }
}

void UpdatePrimaryText(const std::wstring& newText) {
    textPrimary = newText;
    InvalidateRect(hwnd, NULL, TRUE);
}

void UpdateSecondaryText(const std::wstring& newText) {
    textSecondary = newText;
    InvalidateRect(hwnd, NULL, TRUE);
}

LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
                case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);

            RECT clientRect;
            GetClientRect(hwnd, &clientRect);

            // Fondo transparente
            SetBkMode(hdc, TRANSPARENT);
            SetTextColor(hdc, RGB(255, 255, 255));

            // Fuente primaria
            HFONT hFontPrimary = CreateFont(24, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE,
                DEFAULT_CHARSET, OUT_OUTLINE_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
                VARIABLE_PITCH, L"Inconsolata");
            SelectObject(hdc, hFontPrimary);

            // Posición del texto principal
            RECT textRectPrimary = { 20, 30, clientRect.right - 20, clientRect.bottom };
            DrawText(hdc, textPrimary.c_str(), -1, &textRectPrimary, DT_CENTER | DT_TOP);

            // Dibujar la imagen si existe
            if (hBitmap) {
                HDC hdcMem = CreateCompatibleDC(hdc);
                SelectObject(hdcMem, hBitmap);
                
                BITMAP bmp;
                GetObject(hBitmap, sizeof(BITMAP), &bmp);

                int imgX = (clientRect.right - bmp.bmWidth) / 2;  // Centrar horizontalmente
                int imgY = 70;  // Espaciado entre textos

                BitBlt(hdc, imgX, imgY, bmp.bmWidth, bmp.bmHeight, hdcMem, 0, 0, SRCCOPY);
                DeleteDC(hdcMem);
            }

            // Fuente secundaria
            HFONT hFontSecondary = CreateFont(18, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                DEFAULT_CHARSET, OUT_OUTLINE_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
                VARIABLE_PITCH, L"Inconsolata");
            SelectObject(hdc, hFontSecondary);

            // Posición del texto secundario
            RECT textRectSecondary = { 20, 150, clientRect.right - 20, clientRect.bottom };
            DrawText(hdc, textSecondary.c_str(), -1, &textRectSecondary, DT_CENTER | DT_TOP);

            // Limpiar
            DeleteObject(hFontPrimary);
            DeleteObject(hFontSecondary);

            EndPaint(hwnd, &ps);
        } break;


        case WM_DESTROY:
            PostQuitMessage(0);
            break;
            
        default:
            return DefWindowProc(hwnd, uMsg, wParam, lParam);
    }
    return 0;
}