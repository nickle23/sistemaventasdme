@echo off
title Compilador a EXE - Mundo Escolar
cls

echo ==========================================
echo   COMPILADOR A EXE - MUNDO ESCOLAR
echo ==========================================
echo.
echo Este programa convertira tus scripts Python
echo a ejecutables .exe independientes.
echo.
echo NOTA: Necesitas Python instalado para compilar.
echo Una vez compilados, los .exe funcionaran
echo en cualquier PC sin Python.
echo.
echo Presiona cualquier tecla para comenzar...
pause >nul

echo.
echo [LIMPIEZA TOTAL] Preparando sistema...
echo.

REM Eliminar TODO residuo anterior
echo    - Eliminando carpetas temporales...
if exist "build" rmdir /s /q "build" 2>nul
if exist "dist" rmdir /s /q "dist" 2>nul
if exist "__pycache__" rmdir /s /q "__pycache__" 2>nul

echo    - Eliminando archivos temporales...
if exist "*.spec" del /f "*.spec" 2>nul

echo    OK - Sistema limpio
echo.

REM Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Necesitas Python instalado para compilar.
    echo.
    echo Instala Python desde: https://www.python.org/downloads/
    echo Marca "Add Python to PATH" durante la instalacion.
    echo.
    pause
    exit /b 1
)

echo.
echo [PASO 1/3] Instalando PyInstaller...
python -m pip install pyinstaller --quiet
if errorlevel 1 (
    echo ERROR: No se pudo instalar PyInstaller
    pause
    exit /b 1
)
echo    OK - PyInstaller instalado

echo.
echo [PASO 2/3] Compilando Gestor de Usuarios...
echo    Esto puede tardar 1-2 minutos...
echo    (Los archivos temporales se guardan en %TEMP%)
python -m PyInstaller --onefile --windowed --clean --workpath "%TEMP%\pyinst_build" --distpath "dist" --name "Gestor_Usuarios" --add-data "usuarios.json;." gestor_usuarios.py
if errorlevel 1 (
    echo ERROR: Fallo la compilacion del Gestor
    pause
    exit /b 1
)
echo    OK - Compilado

REM Eliminar carpeta build de TEMP si existe
if exist "%TEMP%\pyinst_build" rmdir /s /q "%TEMP%\pyinst_build" 2>nul
echo    OK - Temporales eliminados

echo.
echo [PASO 3/3] Compilando Sincronizador...
echo    Esto puede tardar 1-2 minutos...
echo    (Los archivos temporales se guardan en %TEMP%)
python -m PyInstaller --onefile --console --clean --workpath "%TEMP%\pyinst_build2" --distpath "dist" --name "Sincronizador" --add-data "productos.json;." --add-data "excel;excel" sincronizador_automatico.py
if errorlevel 1 (
    echo ERROR: Fallo la compilacion del Sincronizador
    pause
    exit /b 1
)
echo    OK - Compilado

REM Eliminar carpeta build de TEMP si existe
if exist "%TEMP%\pyinst_build2" rmdir /s /q "%TEMP%\pyinst_build2" 2>nul
echo    OK - Temporales eliminados

echo.
echo [LIMPIEZA FINAL] Eliminando residuos...
if exist "*.spec" del /f "*.spec" 2>nul
if exist "%TEMP%\pyinst_build" rmdir /s /q "%TEMP%\pyinst_build" 2>nul
if exist "%TEMP%\pyinst_build2" rmdir /s /q "%TEMP%\pyinst_build2" 2>nul
echo    OK - Temporales eliminados

echo.
echo ==========================================
echo   COMPILACION COMPLETADA!
echo ==========================================
echo.
echo Tus ejecutables estan en la carpeta "dist":
echo   - dist\Gestor_Usuarios.exe
echo   - dist\Sincronizador.exe
echo.
echo PASOS:
echo 1. Copia los .exe de la carpeta dist a la raiz
echo 2. Elimina la carpeta dist cuando termines
echo.
echo Presiona una tecla para abrir la carpeta dist...
pause >nul
start dist
