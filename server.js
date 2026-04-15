app.post("/analyse-ticket", async (req, res) => {
    try {
        const { image, mimeType, isLabelScan } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        let promptSysteme = "";

        if (isLabelScan) {
            promptSysteme = "MISSION HACCP : Lis cette etiquette. Extrais : nom, lot, dlc (DD/MM/YY). JSON pur uniquement.";
        } else {
      // ... dans app.post("/analyse-ticket") ...
const promptSysteme = `MISSION EXPERT ÉCONOMAT : Extraire tous les articles. 
    RÈGLES CRITIQUES :
    1. PIÈGES SÉMANTIQUES : Les articles comme 'Lapin chocolat', 'Lapin ruban' ou confiseries sont des 'divers'. Ne jamais les mettre en 'proteine'.
    2. CATÉGORIES (5) : 
       - proteine: Viandes, poissons, oeufs, charcuterie.
       - glucides: Pâtes, riz, pommes de terre, gnocchis, féculents, pain.
       - garniture: Légumes verts, fruits, champignons, herbes.
       - cremerie: Lait, crème, beurre, fromages.
       - divers: Épices, sauces, confiserie, boissons, économat.
    3. PRIX : Garde le prix total ligne par ligne.
    Format JSON strict : {"total": 0.00, "proteine":[], "glucides":[], "garniture":[], "cremerie":[], "divers":[]}`;
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
