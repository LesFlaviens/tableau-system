// Dans ton fichier server.js (ou index.js)

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
    res.sendFile(path.join(__dirname, 'public', 'chef.html')); // C'EST ICI QUE CA BLOQUE
});
