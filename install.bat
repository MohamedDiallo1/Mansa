@echo off
echo ===============================================
echo Installation de l'interface admin Mansa
echo ===============================================
echo.

echo 1. Installation des dependencies Node.js...
call npm install
if %errorlevel% neq 0 (
    echo Erreur lors de l'installation des dependencies
    pause
    exit /b 1
)

echo.
echo 2. Creation du compte administrateur...
call npm run create-admin
if %errorlevel% neq 0 (
    echo Erreur lors de la creation du compte admin
    pause
    exit /b 1
)

echo.
echo ===============================================
echo Installation terminee avec succes !
echo ===============================================
echo.
echo Prochaines etapes :
echo 1. Demarrer XAMPP et activer MySQL
echo 2. Creer la base de donnees 'mansa_db'
echo 3. Importer le fichier database/init.sql
echo 4. Lancer l'application avec : npm start
echo 5. Aller sur http://localhost:3000
echo.
echo Identifiants par defaut :
echo Email: admin@mansa.com
echo Mot de passe: admin123
echo.
pause
