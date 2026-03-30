// Dans ton fichier server.js (ou index.js)
const express = require('express');
const app = express();
const path = require('path');

// 1. Assure-toi que ton dossier public est bien servi :
app.use(express.static(path.join(__dirname, 'public'))); 

// 2. Les routes manuelles pour chaque fichier :
app.get('/haccp.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'haccp.html'));
});

app.get('/menu.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

// 3. LA ROUTE DU CHEF (Corrigée : une seule fois et bien fermée)
app.get('/chef.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chef.html')); 
});

/* ⚠️ N'oublie pas : Tout en bas de ton fichier server.js d'origine, 
il doit y avoir une ligne comme "app.listen(port...)" pour démarrer le serveur. 
Ne l'efface pas ! 
*/
const express = require('express');
const app = express();
const path = require('path');

// 1. Assure-toi que ton dossier public est bien servi :
app.use(express.static(path.join(__dirname, 'public'))); 
// (Remplace 'public' par le nom du dossier où tu as mis tes fichiers HTML)

// 2. Si tu n'utilises pas express.static, tu dois créer les routes manuellement pour chaque fichier :
app.get('/haccp.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'haccp.html'));
});

app.get('/menu.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

app.get('/chef.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chef.html')); 
    
app.get('/chef.html', (req, res) => {
    res.sendFile(__dirname + '/public/chef.html');
});
