# 🚀 Guide : Scraping Complet Initial

## Objectif

Remplir la base de données avec **toutes les annonces disponibles** avant de passer au scraping incrémental quotidien.

## 📋 Étapes pour démarrer un scraping complet initial

### 1. Préparer les URLs de recherche

Pour chaque source, vous devez créer des URLs de recherche qui couvrent **toutes les annonces** :

#### AutoScout24

**Option A : URL générique (toutes les annonces)**
```
https://www.autoscout24.fr/lst?sort=standard&desc=0
```

**Option B : Par marque (plus efficace)**
```
https://www.autoscout24.fr/lst?make=BMW
https://www.autoscout24.fr/lst?make=Mercedes-Benz
https://www.autoscout24.fr/lst?make=Audi
https://www.autoscout24.fr/lst?make=Volkswagen
https://www.autoscout24.fr/lst?make=Opel
https://www.autoscout24.fr/lst?make=Ford
... (toutes les marques)
```

**Option C : Par pays**
```
https://www.autoscout24.fr/lst?cy=FR
https://www.autoscout24.de/lst?cy=DE
https://www.autoscout24.it/lst?cy=IT
```

#### mobile.de

**Option A : URL générique**
```
https://www.mobile.de/fahrzeuge/search.html
```

**Option B : Par marque**
```
https://www.mobile.de/fahrzeuge/suche.html?ms=1900%3B35%3B%3B%3B&mk=1900&mk=3500
```

#### LeBonCoin

**Option A : URL générique**
```
https://www.leboncoin.fr/recherche?category=2&text=voiture
```

**Option B : Par région**
```
https://www.leboncoin.fr/recherche?category=2&text=voiture&locations=Paris__48.856614_2.3522219_3578
https://www.leboncoin.fr/recherche?category=2&text=voiture&locations=Lyon__45.764043_4.835659_69000
```

### 2. Créer un scraping automatique "Sans limite"

#### Via le Dashboard Admin

1. **Allez sur le Dashboard Admin** (`#/admin`)
2. **Cliquez sur "+ Nouveau scraping automatique"**
3. **Remplissez le formulaire** :
   - **Nom** : `Scraping initial complet - [Source]`
   - **Source** : Sélectionnez la source (AutoScout24, mobile.de, LeBonCoin)
   - **URL(s) de recherche** : Collez toutes vos URLs (une par ligne)
   - **Cochez "Sans limite"** : ✅ Important pour scraper toutes les annonces
   - **Planning** : `0 0 * * *` (une fois par jour à minuit) - ou désactivez-le après le premier run
   - **Activer** : ✅ Cochez pour l'activer

4. **Cliquez sur "Enregistrer"**

#### Exemple de configuration

```
Nom: Scraping initial complet - AutoScout24
Source: autoscout24
URLs:
https://www.autoscout24.fr/lst?make=BMW
https://www.autoscout24.fr/lst?make=Mercedes-Benz
https://www.autoscout24.fr/lst?make=Audi
https://www.autoscout24.fr/lst?make=Volkswagen
https://www.autoscout24.fr/lst?make=Opel
https://www.autoscout24.fr/lst?make=Ford
https://www.autoscout24.fr/lst?make=Peugeot
https://www.autoscout24.fr/lst?make=Renault
... (ajoutez toutes les marques)

Limite: ✅ Sans limite
Planning: 0 0 * * * (ou désactivez après le premier run)
Actif: ✅ Oui
```

### 3. Lancer le scraping initial

#### Option A : Lancer manuellement (recommandé pour le premier run)

1. **Allez dans la section "Scrapings automatiques"**
2. **Trouvez votre scraping initial**
3. **Cliquez sur "Exécuter"**
4. **Attendez la fin** (peut prendre plusieurs heures pour des millions d'annonces)

#### Option B : Laisser le planning s'exécuter

Si vous avez configuré un planning, le scraping se lancera automatiquement.

⚠️ **Attention** : Pour un scraping initial, il est recommandé de :
- Lancer manuellement la première fois
- Désactiver le scraping après le premier run
- Créer ensuite un nouveau scraping incrémental pour les mises à jour quotidiennes

### 4. Suivre la progression

#### Dans le Dashboard Admin

- **Statut** : Affiche "⏳ En cours" pendant le scraping
- **Résultats** : Affiche le nombre d'annonces scrapées et sauvegardées
- **Auto-refresh** : La liste se met à jour automatiquement toutes les 10 secondes

#### Dans les logs du serveur

```bash
# Dans le terminal où le backend tourne
# Vous verrez des logs comme :
[INFO] Starting AutoScout24 scraper
[INFO] AutoScout24 scraper started { runId: 'xxx' }
[INFO] AutoScout24 scraper completed { itemsCount: 50000 }
[INFO] Saved 49500 listings to database
```

### 5. Vérifier les résultats

#### Dans le Dashboard Admin

1. **Section "Statistiques globales"** :
   - Vérifiez le nombre total d'annonces
   - Vérifiez la distribution par source

2. **Section "Scrapings automatiques"** :
   - Vérifiez le statut de la dernière exécution
   - Vérifiez le nombre d'annonces scrapées vs sauvegardées

#### Dans la base de données

```sql
-- Vérifier le nombre total d'annonces
SELECT COUNT(*) FROM listings;

-- Vérifier par source
SELECT source_platform, COUNT(*) 
FROM listings 
GROUP BY source_platform;

-- Vérifier les annonces récentes
SELECT COUNT(*) 
FROM listings 
WHERE created_at > NOW() - INTERVAL '1 day';
```

## ⚙️ Configuration recommandée pour le scraping initial

### Stratégie par source

#### AutoScout24
- **URLs** : Une URL par marque (ou URL générique)
- **Limite** : Sans limite ✅
- **Fréquence** : Une seule fois (désactiver après)
- **Temps estimé** : 2-6 heures pour 1M d'annonces

#### mobile.de
- **URLs** : Une URL par marque (ou URL générique)
- **Limite** : Sans limite ✅
- **Fréquence** : Une seule fois (désactiver après)
- **Temps estimé** : 2-6 heures pour 1M d'annonces

#### LeBonCoin
- **URLs** : Une URL par région (ou URL générique)
- **Limite** : Sans limite ✅
- **Fréquence** : Une seule fois (désactiver après)
- **Temps estimé** : 3-8 heures pour 1M d'annonces

## 💰 Coût estimé du scraping initial

### Pour 1 million d'annonces
- **AutoScout24** : ~50-100€
- **mobile.de** : ~50-100€
- **LeBonCoin** : ~50-100€

### Pour 15 millions d'annonces
- **Total** : ~750-1500€ (une seule fois)

⚠️ **Important** : Le coût dépend de votre plan Apify et du nombre d'annonces réellement disponibles.

## 🎯 Après le scraping initial

### 1. Désactiver le scraping complet

Une fois le scraping initial terminé :
1. **Allez dans "Scrapings automatiques"**
2. **Trouvez votre scraping initial**
3. **Cliquez sur "Modifier"**
4. **Décochez "Activer ce scraping automatique"**
5. **Enregistrez**

### 2. Créer un scraping incrémental

Créez un **nouveau scraping automatique** pour les mises à jour quotidiennes :

```
Nom: Scraping incrémental - AutoScout24
Source: autoscout24
URLs: (mêmes URLs que le scraping initial)
Limite: 1000 annonces (scraping incrémental)
Planning: 0 */6 * * * (toutes les 6 heures)
Actif: ✅ Oui
```

### 3. Vérifier les données

- Vérifiez que les annonces sont bien dans la base
- Testez une recherche sur le frontend
- Vérifiez que les prix sont corrects

## 🔧 Dépannage

### Le scraping s'arrête avant la fin

**Cause** : Limite Apify atteinte ou timeout

**Solution** :
1. Vérifiez les logs pour voir où il s'est arrêté
2. Créez un nouveau scraping avec les URLs restantes
3. Ou relancez le scraping (les doublons seront ignorés)

### Certaines annonces ne sont pas scrapées

**Cause** : URLs de recherche incomplètes

**Solution** :
1. Vérifiez que vous avez couvert toutes les marques/régions
2. Ajoutez les URLs manquantes dans un nouveau scraping
3. Relancez pour les annonces manquantes

### Le scraping prend trop de temps

**Cause** : Trop d'annonces à scraper

**Solution** :
1. C'est normal pour un scraping initial (plusieurs heures)
2. Le scraping continue en arrière-plan
3. Vous pouvez fermer le navigateur, le scraping continue sur le serveur

## 📊 Exemple complet : Scraping initial AutoScout24

### Étape 1 : Préparer les URLs

Créez un fichier texte avec toutes les URLs :

```
https://www.autoscout24.fr/lst?make=BMW
https://www.autoscout24.fr/lst?make=Mercedes-Benz
https://www.autoscout24.fr/lst?make=Audi
https://www.autoscout24.fr/lst?make=Volkswagen
https://www.autoscout24.fr/lst?make=Opel
https://www.autoscout24.fr/lst?make=Ford
https://www.autoscout24.fr/lst?make=Peugeot
https://www.autoscout24.fr/lst?make=Renault
https://www.autoscout24.fr/lst?make=Citroen
https://www.autoscout24.fr/lst?make=Fiat
... (ajoutez toutes les marques)
```

### Étape 2 : Créer le scraping

1. Dashboard Admin → "+ Nouveau scraping automatique"
2. Nom : `Scraping initial complet - AutoScout24`
3. Source : `autoscout24`
4. URLs : Collez toutes les URLs (une par ligne)
5. ✅ Cochez "Sans limite"
6. Planning : `0 0 * * *` (ou désactivez après)
7. ✅ Activez
8. Enregistrer

### Étape 3 : Lancer

1. Cliquez sur "Exécuter" sur le scraping créé
2. Attendez (plusieurs heures)
3. Vérifiez les résultats dans le dashboard

### Étape 4 : Passer au scraping incrémental

1. Désactivez le scraping initial
2. Créez un nouveau scraping avec les mêmes URLs mais limite à 1000
3. Configurez le planning toutes les 6 heures

## ✅ Checklist de démarrage

- [ ] URLs de recherche préparées pour chaque source
- [ ] Scraping automatique créé avec "Sans limite"
- [ ] Scraping lancé manuellement ou via planning
- [ ] Progression suivie dans le dashboard
- [ ] Résultats vérifiés après la fin
- [ ] Scraping initial désactivé après la fin
- [ ] Scraping incrémental créé pour les mises à jour

## 🎉 C'est parti !

Une fois le scraping initial terminé, vous aurez une base de données complète et pourrez passer au scraping incrémental quotidien pour maintenir les données à jour à moindre coût.







