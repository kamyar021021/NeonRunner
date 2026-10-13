@echo off
echo Converting all FBX files to GLB...
echo.

set TOOL=node_modules\fbx2gltf\bin\Windows_NT\FBX2glTF.exe

echo === City Kit ===
for /r "public\models\city" %%f in (*.fbx) do (
    echo Converting: %%f
    %TOOL% -b -i "%%f" -o "%%~dpnf.glb"
)

echo === Weapons ===
for /r "public\models\weapons" %%f in (*.fbx) do (
    echo Converting: %%f
    %TOOL% -b -i "%%f" -o "%%~dpnf.glb"
)

echo === Nature ===
for /r "public\models\nature" %%f in (*.fbx) do (
    echo Converting: %%f
    %TOOL% -b -i "%%f" -o "%%~dpnf.glb"
)

echo.
echo ============================
echo Conversion complete!
echo ============================
pause