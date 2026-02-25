# Mise à jour du champ Steering (LHD/RHD)

Ce guide explique comment mettre à jour les annonces existantes avec des valeurs de steering et comment relancer le scraping pour que les nouvelles annonces incluent cette information.

## Option 1 : Mettre à jour les annonces existantes

Un script a été créé pour mettre à jour automatiquement les annonces existantes avec une valeur de steering basée sur leur pays :

- **RHD** (Right-Hand Drive) : GB, UK, IE, MT, CY
- **LHD** (Left-Hand Drive) : Tous les autres pays européens

### Exécuter le script

```bash
cd backend
node src/scripts/update-steering.js
```

Le script va :
1. Trouver toutes les annonces sans valeur de steering
2. Déterminer la valeur appropriée basée sur le pays
3. Mettre à jour les annonces en lots de 500

### Résultat attendu

Après l'exécution, vous devriez voir :
```
✅ Update completed: { updated: X }
```

Où X est le nombre d'annonces mises à jour.

## Option 2 : Relancer le scraping

Les nouvelles annonces scrapées incluront automatiquement le champ steering grâce aux modifications apportées au scraper AutoScout24.

### Depuis l'interface Admin

1. Connectez-vous en tant qu'admin
2. Allez dans la section "Admin" du dashboard
3. Dans la section "Scrapers automatiques", vous pouvez :
   - Voir les scrapers configurés
   - Cliquer sur "Exécuter" pour relancer un scraper existant
   - Créer un nouveau scraper avec une URL de recherche

### Depuis l'API

Vous pouvez également déclencher un scraping via l'API :

```bash
# Exécuter un scraper existant
curl -X POST http://localhost:3001/api/v1/admin/auto-scrapers/{scraperId}/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Nouveau scraping complet

Pour faire un scraping complet qui inclut le steering :

1. **Via l'admin dashboard** :
   - Créez un nouveau scraper ou utilisez un existant
   - Configurez-le avec "Sans limite" pour scraper toutes les annonces
   - Exécutez-le

2. **Les nouvelles annonces** auront automatiquement :
   - Le steering extrait depuis les données AutoScout24 si disponible
   - Sinon, une valeur par défaut basée sur le pays (LHD pour la plupart, RHD pour UK/IE)

## Vérification

Après avoir mis à jour les annonces ou relancé le scraping :

1. Rechargez la page de recherche
2. Les compteurs de "VOLANT À GAUCHE" et "VOLANT À DROITE" devraient maintenant afficher des valeurs > 0
3. Vous pouvez filtrer par steering et voir les résultats correspondants

## Notes

- Les annonces déjà scrapées avant cette mise à jour n'auront pas de steering sauf si vous exécutez le script de mise à jour
- Les nouvelles annonces scrapées incluront automatiquement le steering
- Le script de mise à jour peut être exécuté plusieurs fois sans problème (il ne met à jour que les annonces sans steering)







