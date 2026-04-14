app.post("/analyse-ticket", async (req, res) => {
    try {
        const { image, mimeType } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;
        
        // LE NOUVEAU CERVEAU : Ordres militaires + Anti-Hallucination
        const promptSysteme = `Tu es un chef exécutif et un auditeur financier intraitable. 
TA MISSION OBLIGATOIRE : Extraire la TOTALITÉ des articles présents sur cette facture. LIS CHAQUE LIGNE ATTENTIVEMENT.
Classe chaque article trouvé dans l'une de ces 4 catégories :
1. proteine : Viandes, poissons, fruits de mer, charcuterie.
2. garniture : Légumes frais, fruits frais, herbes.
3. cremerie : Fromages, lait, beurre, crème, oeufs.
4. divers : Épicerie sèche, épices, huiles, conserves, emballages, boissons.

RÈGLE ABSOLUE 1 : Tu dois répondre UNIQUEMENT par un objet JSON valide.
RÈGLE ABSOLUE 2 : NE RECOPIE PAS L'EXEMPLE. Tu dois extraire les VRAIES données de l'image. Si tu ne trouves pas le poids, mets "1 pce". S'il n'y a pas d'article pour une catégorie, renvoie un tableau vide [].

Modèle attendu (Ceci n'est qu'un exemple visuel, utilise les vraies données du ticket) :
{
  "total": 84.86,
  "proteine": [{"nom": "Poulet fermier", "poids": "1.2kg", "prix": 15.50}],
  "garniture": [{"nom": "Courgette Espagne", "poids": "1.1kg", "prix": 3.42}],
  "cremerie": [{"nom": "Beurre doux", "poids": "250g", "prix": 3.00}],
  "divers": [{"nom": "Matcha Latte", "poids": "0.17kg", "prix": 5.99}]
}`;

        const payload = {
            contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }],
            generation_config: { 
                response_mime_type: "application/json",
                temperature: 0.1 // 👈 Bride l'imagination : 100% précision mathématique
            }
        };

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error ? data.error.message : "Erreur API Google");
        if (!data.candidates || !data.candidates[0]) throw new Error("L'IA n'a pas pu lire l'image. Assure-toi que la photo est nette.");

        let rawText = data.candidates[0].content.parts[0].text;
        
        // Nettoyage au cas où l'IA ajoute des balises Markdown
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // GILET PARE-BALLES ULTIME : Vérification du parsing
        let aiResponse;
        try {
            aiResponse = JSON.parse(rawText);
        } catch (parseError) {
            console.error("Erreur de format IA (Texte brut) :", rawText);
            throw new Error("L'IA a mal structuré sa réponse. Relance le scan.");
        }
        
        res.json({ resultat: aiResponse });

    } catch (error) {
        console.error("Erreur backend:", error);
        res.status(500).json({ error: error.message });
    }
});
