# Mise à jour des annonces depuis le champ specifications

Ce guide explique comment exécuter le script `update-from-specifications.js` pour extraire et remplir les champs `fuel_type`, `transmission`, `doors`, et `power_hp` depuis le champ `specifications` des annonces existantes.

## Contexte

Le scraper AutoScout24 stocke les données dans un champ `specifications` avec des clés capitalisées :
- `Fuel`: "Diesel", "Petrol", etc.
- `Transmission`: "Automatic", "Manual", etc.
- `Door Count`: 5, 3, etc.
- `Power`: "140 kW" (en kilowatts)

Le code de scraping a été mis à jour pour extraire ces données lors des nouveaux scrapings, mais les annonces déjà présentes dans la base de données n'ont pas ces champs remplis. Ce script va parcourir ces annonces et extraire ces informations depuis leur champ `specifications`.

## Comment exécuter le script

1. **Assurez-vous que votre backend est arrêté** ou que vous exécutez le script dans un environnement où il n'y a pas de conflits d'accès à la base de données.
2. Ouvrez votre terminal.
3. Naviguez jusqu'au répertoire `backend` de votre projet Carindex :
   ```bash
   cd /Users/theodoredignet/Projects/carindex/backend
   ```
4. Exécutez le script Node.js :
   ```bash
   node src/scripts/update-from-specifications.js
   ```

## Ce qui va se passer

- Le script va se connecter à votre base de données Supabase.
- Il va rechercher toutes les annonces où :
  - Le champ `specifications` n'est pas vide
  - ET au moins un des champs suivants est `null` : `fuel_type`, `transmission`, `doors`, `power_hp`
- Pour chaque annonce trouvée, il va :
  - Extraire `fuel_type` depuis `specifications.Fuel` (normalisé en minuscules : "diesel", "petrol", "hybrid", "electric")
  - Extraire `transmission` depuis `specifications.Transmission` (normalisé : "automatic" ou "manual")
  - Extraire `doors` depuis `specifications['Door Count']`
  - Extraire `power_hp` depuis `specifications.Power` (converti de kW en HP : 1 kW ≈ 1.36 HP)
- Les annonces seront mises à jour par lots pour optimiser les performances.
- Des messages de log s'afficheront dans votre terminal pour indiquer la progression.
- À la fin, un message de succès s'affichera, indiquant le nombre d'annonces mises à jour.
- Le cache des facets sera vidé automatiquement.

## Exemple de données extraites

Si `specifications` contient :
```json
{
  "Fuel": "Diesel",
  "Transmission": "Automatic",
  "Door Count": 5,
  "Power": "140 kW"
}
```

Le script va mettre à jour :
- `fuel_type`: "diesel"
- `transmission`: "automatic"
- `doors`: 5
- `power_hp`: 190 (140 kW × 1.36 ≈ 190 HP)

## Après l'exécution du script

1. **Redémarrez votre serveur backend** (si vous l'aviez arrêté) :
   ```bash
   cd /Users/theodoredignet/Projects/carindex/backend
   npm run dev
   ```
2. **Rechargez la page de recherche Carindex dans votre navigateur.**
3. Les filtres et les cartes d'annonces devraient maintenant afficher les informations extraites (carburant, boîte, portes, puissance) au lieu de "Non renseigné" ou de champs vides.

## Pour les futurs scrapings

Le scraper AutoScout24 a été modifié pour inclure l'extraction de ces champs pour toutes les nouvelles annonces. Vous pouvez relancer un scraping depuis l'interface Admin pour ajouter de nouvelles annonces avec ces informations déjà extraites.







