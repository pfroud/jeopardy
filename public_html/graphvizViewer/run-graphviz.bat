@echo off
rem https://graphviz.org/documentation/
"C:\Users\pfrou\Downloads\stable_windows_10_msbuild_Release_Win32_graphviz-2.49.3-win32\Graphviz\bin\dot.exe" -Tsvg -o graphvizOutput.svg graphvizInput.gv
if %ERRORLEVEL% neq 0 pause