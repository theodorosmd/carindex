# 🔧 Correction de l'URL du Scraper BMW

## Problème
Le scraper "Autoscout BMW Bis" ne récupère que **222 annonces** alors qu'AutoScout24 en affiche **160,235** pour BMW.

## Cause
L'URL de recherche est trop restrictive avec plusieurs filtres qui limitent les résultats :
- `search_id=2deu8na73ft` (ID de recherche spécifique)
- `powertype=kw` (filtre puissance)
- `cy=D%2CA%2CB%2CE%2CF%2CI%2CL%2CNL` (pays spécifiques)
- `damaged_listing=exclude`

## Solution

### Option 1 : URL simple (recommandée)
Utilisez une URL minimale qui capture toutes les BMW :

```
https://www.autoscout24.fr/lst/bmw
```

ou

```
https://www.autoscout24.fr/lst?make=BMW
```

### Option 2 : URL avec tri standard uniquement
Si vous voulez garder un tri cohérent :

```
https://www.autoscout24.fr/lst/bmw?sort=standard&desc=0
```

### Option 3 : URL avec pays européens (si nécessaire)
Si vous voulez limiter à l'Europe mais sans autres filtres :

```
https://www.autoscout24.fr/lst/bmw?cy=D%2CA%2CB%2CE%2CF%2CI%2CL%2CNL&sort=standard
```

## Action à prendre

1. **Allez sur le Dashboard Admin** (`#/admin`)
2. **Trouvez le scraper "Autoscout BMW Bis"**
3. **Cliquez sur "Modifier"**
4. **Remplacez l'URL actuelle** par une des URLs ci-dessus (Option 1 recommandée)
5. **Sauvegardez**
6. **Relancez le scraper** avec "Exécuter"

## Vérification

Après modification, le scraper devrait récupérer beaucoup plus d'annonces (potentiellement plusieurs milliers).

**Note** : Le scraper Puppeteer peut être limité par le nombre de pages parcourues.







