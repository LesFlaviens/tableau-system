app.post("/analyse-ticket", async (req, res) => {
    try {
        const { image, mimeType, isLabelScan } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        let promptSysteme = "";

        if (isLabelScan) {
            promptSysteme = "MISSION HACCP : Lis cette etiquette. Extrais : nom, lot, dlc (DD/MM/YY). JSON pur uniquement.";
        } else {
            promptSysteme = `MISSION EXPERT ECONOMAT : Extraire tous les articles. 
            REGLES SPECIALES :
            1. ANALYSE SEMANTIQUE : Si tu vois 'Lapin ruban' ou 'Lapin chocolat', c'est un article de CONFISERIE/PAQUES, classe-le dans 'divers'. Ne pas confondre avec de la viande.
            2. CATEGORIES (5) : 
               - proteine: Viandes, poissons, oeufs, charcuterie.
               - garniture: Legumes, fruits, herbes fraiches.
               - glucides: Pates, riz, pommes de terre, gnocchis, semoule, flocons d'avoine, pain.
               - cremerie: Lait, beurre, creme, fromages.
               - divers: Epices, sauces, sucre, confiserie (lapins), alcool, emballages.
            3. PRIX : Conserve le prix unitaire ou au kilo si precisé.
            Format JSON : {"total": 0.00, "proteine":[], "garniture":[], "glucides":[], "cremerie":[], "divers":[]}`;
        }

        const payload = {
            contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }],
            generation_config: { response_mime_type: "application/json", temperature: 0.1 }
        };

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });

        const data = await response.json();
        let rawText = data.candidates[0].content.parts[0].text;
        res.json({ resultat: JSON.parse(rawText) });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
