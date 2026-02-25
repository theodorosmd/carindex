# 🚗 Carindex V1 - Plan Bootstrap Réaliste
## Version Ultra Focus pour Solo Founder

---

# PARTIE 1 – Vision V1 de Carindex (version réduite)

## Ce que Carindex V1 fait vraiment

Carindex V1 est un **outil de sourcing et pricing pour marchands VO** qui :

1. **Agrège des annonces VO** depuis 2-3 sources principales (AutoScout24, mobile.de, LeBonCoin)
2. **Calcule un prix marché simple** basé sur les comparables trouvés
3. **Permet de rechercher rapidement** des véhicules avec filtres essentiels
4. **Envoie des alertes email** quand de nouvelles annonces correspondent aux critères

**En résumé** : Un moteur de recherche intelligent + un indicateur de prix marché, rien de plus.

---

## Ce que Carindex V1 ne fera PAS

**Volontairement exclu pour garder le focus** :

- ❌ **Marketplace B2B** : pas d'intermédiation, pas de transactions
- ❌ **Leadgen complexe** : pas de scoring de leads, pas de qualification automatique
- ❌ **Rapports data pour constructeurs** : pas de rapports enterprise, pas de consulting
- ❌ **API publique complète** : pas d'intégrations DMS/CRM au début
- ❌ **Analyse stock avancée** : pas de rotation, pas de prédictions
- ❌ **Multi-pays complexe** : 1-2 pays max au début (France + 1 autre)
- ❌ **Arbitrage multi-pays** : trop complexe pour V1
- ❌ **Dashboard analytics poussé** : pas de KPIs complexes, pas de graphiques avancés

**Pourquoi** : Chaque feature exclue = moins de code à maintenir, moins de bugs, plus de focus sur ce qui génère de la valeur immédiate.

---

## Les 3 promesses principales pour un marchand VO

### 1. "Trouve des véhicules plus vite"
**Problème** : Un marchand passe des heures à chercher manuellement sur plusieurs sites.  
**Solution** : Une seule recherche sur Carindex = résultats de 2-3 sites en même temps.

### 2. "Sache si le prix est bon"
**Problème** : Difficile de savoir si un véhicule est bien prix sans comparer manuellement.  
**Solution** : Carindex calcule automatiquement un prix marché basé sur les comparables.

### 3. "Ne rate aucune opportunité"
**Problème** : Les bonnes affaires partent vite, impossible de surveiller 24/7.  
**Solution** : Alertes email automatiques dès qu'une nouvelle annonce correspond aux critères.

---

## Phrase simple pour expliquer Carindex au téléphone

> **"Carindex, c'est comme avoir un assistant qui surveille AutoScout24, mobile.de et LeBonCoin pour toi. Dès qu'une annonce correspond à ce que tu cherches, tu reçois un email. Et pour chaque véhicule, on te dit si le prix est dans la moyenne du marché ou pas."**

**Pourquoi ça marche** :
- Concret (assistant, email, prix)
- Compréhensible en 30 secondes
- Résout un problème réel (perdre du temps à chercher)

---

# PARTIE 2 – Scope produit V1 (fonctionnalités)

## 1) Must have (absolument nécessaires pour vendre)

### Recherche multi-critères
**À quoi ça sert** : Permet de trouver rapidement des véhicules selon marque, modèle, année, prix, kilométrage, carburant, localisation.  
**Pourquoi prioritaire** : C'est la fonctionnalité de base. Sans recherche efficace, le produit n'a pas de valeur.

### Prix marché de base
**À quoi ça sert** : Affiche un prix moyen calculé à partir des véhicules similaires trouvés dans la base.  
**Pourquoi prioritaire** : C'est le différenciateur principal. Un marchand veut savoir si un véhicule est bien prix avant d'appeler.

### Alertes simples (email)
**À quoi ça sert** : Envoie un email quand une nouvelle annonce correspond aux critères de recherche sauvegardés.  
**Pourquoi prioritaire** : Crée l'habitude d'utilisation. Un marchand qui reçoit des alertes utiles = client qui reste.

### Inscription / Connexion basique
**À quoi ça sert** : Permet de créer un compte, sauvegarder des recherches, gérer des alertes.  
**Pourquoi prioritaire** : Sans compte utilisateur, impossible de monétiser ou de personnaliser l'expérience.

### Dashboard minimal
**À quoi ça sert** : Affiche les recherches récentes, les alertes actives, un aperçu des résultats.  
**Pourquoi prioritaire** : Donne une impression de produit "fini" même si c'est minimal.

---

## 2) Should have (important mais peut venir après le lancement)

### Indice de confiance du prix marché
**À quoi ça sert** : Affiche un pourcentage (ex: 75%) qui indique la fiabilité du prix marché calculé.  
**Pourquoi pas must have** : Le prix marché seul fonctionne déjà. L'indice de confiance améliore la crédibilité mais n'est pas bloquant.

### Historique de prix simple
**À quoi ça sert** : Montre l'évolution du prix d'une annonce si elle est suivie depuis plusieurs jours.  
**Pourquoi pas must have** : Utile mais pas essentiel pour un marchand qui cherche à acheter rapidement.

### Filtres avancés (version, finition, couleur)
**À quoi ça sert** : Permet d'affiner la recherche avec des critères supplémentaires.  
**Pourquoi pas must have** : Les filtres de base (marque, modèle, prix, km) suffisent pour commencer.

### Export résultats (CSV/Excel)
**À quoi ça sert** : Permet de télécharger les résultats de recherche pour traitement externe.  
**Pourquoi pas must have** : Nice to have pour certains clients, mais pas critique.

### Analyse stock basique
**À quoi ça sert** : Compare le stock d'un marchand avec le marché (ex: "tu as 5 BMW 320d, le marché en a 200").  
**Pourquoi pas must have** : Utile pour les concessions, mais pas essentiel pour les petits marchands.

---

## 3) Won't have pour V1 (ce sera pour plus tard)

### API publique complète
**Pourquoi pas maintenant** : Complexe à maintenir, nécessite documentation, support technique. On peut vendre sans API au début.

### Reports avancés / Analytics poussés
**Pourquoi pas maintenant** : Les marchands veulent d'abord trouver des véhicules, pas analyser des tendances. C'est pour plus tard.

### Analyse stock poussée (rotation, prédictions)
**Pourquoi pas maintenant** : Trop complexe, nécessite beaucoup de données historiques. Pas prioritaire.

### Marketplace ou arbitrage intégré
**Pourquoi pas maintenant** : Change complètement le modèle produit. Trop risqué pour V1.

### Multi-pays complexe (plus de 2 pays)
**Pourquoi pas maintenant** : Chaque pays = nouvelles sources, nouvelles règles, plus de complexité. On se concentre sur 1-2 pays d'abord.

### Intégrations DMS/CRM
**Pourquoi pas maintenant** : Cycle de vente très long, besoin de support technique dédié. Pas pour V1.

### Scoring automatique de véhicules
**Pourquoi pas maintenant** : Nécessite ML, beaucoup de données, validation complexe. Trop tôt.

---

# PARTIE 3 – Roadmap 12 mois réaliste

## Phase 1 : Mois 0 à 3 (Proto utilisable)

### Objectif
Avoir un prototype fonctionnel que des vrais marchands peuvent utiliser et qui génère de la valeur.

### Pays ciblés
- **France** (priorité #1)
- **Allemagne** (priorité #2, si temps disponible)

### Sources ciblées
- **LeBonCoin** (France) - Source principale
- **AutoScout24** (France + Allemagne) - Source secondaire
- **mobile.de** (Allemagne) - Si temps disponible

### Features must have à livrer
1. ✅ Scraping LeBonCoin + AutoScout24 (France)
2. ✅ Base de données avec 50K+ annonces
3. ✅ Recherche multi-critères fonctionnelle
4. ✅ Calcul prix marché basique
5. ✅ Système d'alertes email
6. ✅ Inscription / Connexion
7. ✅ Dashboard minimal

### Résultat minimum pour oser faire payer
- **50K+ annonces** en base (France)
- **10-20 beta testers** qui utilisent le produit régulièrement
- **Feedback positif** : "Je l'utilise vraiment" (pas juste "c'est intéressant")
- **Alertes qui fonctionnent** : Les emails arrivent, les résultats sont pertinents
- **Prix marché cohérent** : Les marchands valident que les prix sont réalistes

**Si ces critères sont remplis** → On peut commencer à facturer.

---

## Phase 2 : Mois 3 à 6 (Beta → Produit vendable)

### Objectif
Passer de "proto gratuit" à "produit payant" avec les premiers clients qui paient réellement.

### Améliorations produit
1. **Indice de confiance** : Ajouter un % de fiabilité au prix marché
2. **Filtres avancés** : Version, finition, couleur
3. **Export CSV** : Télécharger les résultats
4. **Historique prix simple** : Voir l'évolution d'une annonce
5. **Amélioration scraping** : Plus de sources, meilleure qualité données
6. **Interface plus polie** : Design plus propre, moins de bugs

### Premiers clients payants
- **Objectif** : 10-20 clients payants à la fin du mois 6
- **Stratégie** : 
  - Convertir les beta testers (offre early bird 50% réduction)
  - Acquisition digitale (Google Ads ciblés "sourcing vo", "prix marché vo")
  - Outreach LinkedIn (marchands VO français)
  - Bouche-à-oreille (programme parrainage)

### Itérations rapides en fonction des retours
- **Feedback hebdomadaire** : Appeler 2-3 clients chaque semaine
- **Priorisation** : Ne développer que ce qui est demandé par plusieurs clients
- **Quick wins** : Corriger les bugs rapidement, améliorer l'UX des features existantes

**Résultat attendu mois 6** :
- 15-25 clients payants
- MRR : 1,500 - 3,000 €
- Churn < 10% mensuel
- NPS > 40

---

## Phase 3 : Mois 6 à 12 (Stabiliser, améliorer, scaler)

### Ce que j'ajoute côté produit
1. **Analyse stock basique** : Comparer stock marchand vs marché
2. **Alertes premium** : Filtres plus avancés, webhooks
3. **Multi-pays** : Ajouter Allemagne (si pas fait avant)
4. **Amélioration prix marché** : Algorithme plus sophistiqué
5. **Mobile responsive** : Interface utilisable sur mobile
6. **Performance** : Optimiser la vitesse de recherche

### Ce que je mets en place côté vente
1. **Process de vente** : Script commercial, email sequences
2. **Marketing** : Contenu SEO ("prix marché vo", "sourcing automobile")
3. **Partenariats** : Associations professionnelles (CNPA, etc.)
4. **Upsells** : Inciter les clients Starter à passer en Pro
5. **Rétention** : Suivi clients, feedback régulier

### Objectif chiffré raisonnable (fin mois 12)

**Scénario réaliste** :
- **50-100 clients payants**
- **MRR : 5,000 - 10,000 €**
- **ARR : 60,000 - 120,000 €**

**Répartition clients** :
- 60% Starter (99 €/mois) = 30-60 clients
- 35% Pro (299 €/mois) = 18-35 clients
- 5% Plus (599 €/mois) = 3-5 clients

**Pourquoi c'est réaliste** :
- 50 clients × 200 €/mois moyen = 10K €/mois
- Avec churn 5% mensuel, besoin de 2-3 nouveaux clients/mois
- Acquisition digitale + bouche-à-oreille = faisable solo

**Ce qui serait "trop optimiste"** :
- ❌ 500 clients en 12 mois (nécessite équipe sales)
- ❌ 50K € MRR (nécessite produit enterprise)
- ❌ Multi-pays complexe (trop de ressources)

---

# PARTIE 4 – Monétisation V1 simple

## 2-3 plans max (volontairement simple)

### Plan STARTER (99 €/mois)
**Cible** : Petits marchands indépendants (1-5 véhicules/mois)

**Inclus** :
- ✅ 200 recherches/mois
- ✅ 10 alertes actives
- ✅ Prix marché basique
- ✅ Support email

**Positionnement** : "Si tu fais moins de 5 ventes/mois, prends Starter."

---

### Plan PRO (299 €/mois)
**Cible** : Marchands moyens, petites concessions (10-30 véhicules/mois)

**Inclus** :
- ✅ Recherches illimitées
- ✅ 50 alertes actives
- ✅ Prix marché + indice confiance
- ✅ Export CSV
- ✅ Analyse stock basique
- ✅ Support prioritaire

**Positionnement** : "Si tu gères un parc de plus de 10 véhicules, prends Pro."

**Sweet spot** : C'est le plan qu'on veut pousser. Meilleur ratio valeur/prix.

---

### Plan PLUS (599 €/mois) - Optionnel
**Cible** : Concessions moyennes (30+ véhicules/mois)

**Inclus** :
- ✅ Tout Pro
- ✅ Alertes illimitées
- ✅ Webhooks (intégrations)
- ✅ Support téléphone
- ✅ Account manager dédié

**Positionnement** : "Si tu as besoin d'intégrations ou de support premium."

**Note** : Ce plan peut attendre mois 6-9. Pas besoin au début.

---

## Stratégie pour augmenter les prix plus tard

### Méthode "Grandfathering"
**Principe** : Les clients existants gardent leur prix, les nouveaux paient le nouveau prix.

**Exemple** :
- Mois 1-6 : Starter 99 €, Pro 299 €
- Mois 7+ : Starter 149 €, Pro 399 €
- Clients existants : Restent à 99 € / 299 €

**Avantages** :
- Pas de churn lié à l'augmentation
- Les clients existants se sentent privilégiés
- Les nouveaux clients acceptent le nouveau prix

### Communication
> "On augmente nos prix pour les nouveaux clients à partir du [date]. En tant que client existant, tu gardes ton prix actuel. Merci de ta confiance !"

### Alternative : "Upgrade volontaire"
**Principe** : Proposer aux clients existants de passer au nouveau prix en échange d'avantages.

**Exemple** :
- "Passe à 149 € et reçois 3 mois d'alertes premium gratuites"
- "Passe à 399 € et reçois un setup personnalisé gratuit"

**Avantages** :
- Certains clients acceptent volontairement
- Pas de churn
- Augmente le LTV

---

# PARTIE 5 – Focus technique minimal

## Scraping

### Combien de sources au début
**2 sources max** :
1. **LeBonCoin** (France) - Priorité #1
2. **AutoScout24** (France) - Priorité #2

**Pourquoi pas plus** :
- Chaque source = nouveau code à maintenir
- Chaque source = nouveaux bugs potentiels
- Mieux vaut 2 sources bien scrapées que 5 sources mal scrapées

### Stratégie simple de fréquence
**Scraping incrémental** : Ne scraper que les nouvelles annonces, pas tout le catalogue.

**Fréquence** :
- **Nouvelles annonces** : Toutes les 6-8 heures
- **Mises à jour prix** : Toutes les 12 heures
- **Vérification statut** : Toutes les 24 heures (active/expiré)

**Pourquoi** :
- Réduit les coûts Apify
- Réduit la charge serveur
- Suffisant pour avoir des données fraîches

### Le minimum pour ne pas exploser l'infra
**Limites** :
- Max 100K annonces en base (France)
- Scraping par segments (top 20 marques d'abord)
- Cache Redis pour éviter requêtes répétées
- Queue Bull pour gérer les tâches asynchrones

**Coûts infrastructure** :
- Apify : 200-400 €/mois (scraping)
- Supabase : 50-100 €/mois (database)
- Redis : 20-50 €/mois (cache)
- **Total : 270-550 €/mois**

---

## Base de données

### Modèle simple (sans tout détailler)

**Table `listings`** :
- ID, source, URL, marque, modèle, année, prix, km, carburant, localisation, images, description, dates

**Table `price_history`** :
- ID, listing_id, prix, date

**Table `market_stats`** :
- ID, marque, modèle, année, prix_moyen, prix_mediane, nb_comparables, date_calcul

**Table `users`** :
- ID, email, plan, créé le

**Table `alerts`** :
- ID, user_id, critères (JSON), actif, créé le

**C'est tout.** Pas besoin de plus pour V1.

### Ce qui est nécessaire pour la recherche
**Indexes essentiels** :
- `listings(brand, model, year)` : Pour recherche rapide
- `listings(price, mileage)` : Pour filtres prix/km
- `listings(location_country, location_city)` : Pour recherche géographique
- `listings(created_at)` : Pour trier par date

**Full-text search** : Typesense ou PostgreSQL `tsvector` pour recherche texte (description, etc.)

### Ce qui est nécessaire pour le prix marché
**Algorithme simple** :
1. Trouver comparables (même marque/modèle, année ±2, km ±20%)
2. Calculer moyenne + médiane des prix
3. Ajuster selon kilométrage si nécessaire
4. Retourner prix marché + nombre de comparables

**Pas besoin de ML ou d'algorithme complexe** : Une moyenne pondérée fonctionne déjà très bien.

---

## Produit

### Ce que je développe moi-même
**Priorité** :
1. **Backend API** : Node.js + Express (simple, rapide)
2. **Frontend** : HTML/CSS/JS vanilla ou Vue.js simple (pas React complexe)
3. **Système d'alertes** : Cron job qui envoie des emails
4. **Calcul prix marché** : Algorithme simple

**Pourquoi** : C'est le coeur du produit. Je dois comprendre comment ça marche pour itérer rapidement.

### Ce que je peux déléguer à un freelance
**Candidats pour délégation** :
1. **Scraping** : Si je ne maîtrise pas bien Apify, je délègue à un dev qui connaît
2. **Design UI** : Un designer freelance pour rendre l'interface plus propre
3. **Infrastructure** : Setup Docker, CI/CD (si je n'ai pas le temps)
4. **Tests** : Tests automatisés (si nécessaire)

**Budget freelance** : 2,000 - 5,000 € pour les 3 premiers mois (scraping + design)

---

## Tech à éviter au début

### API publique complète
**Pourquoi éviter** :
- Nécessite documentation complète
- Support technique dédié
- Sécurité plus complexe
- Cycle de vente long

**Quand l'ajouter** : Mois 6-12, si des clients le demandent vraiment.

### Moteur de stats trop complexe
**Pourquoi éviter** :
- Nécessite beaucoup de données historiques
- Complexité algorithmique
- Pas de valeur immédiate pour V1

**Quand l'ajouter** : Année 2, quand on a assez de données.

### Multi-pays complexe
**Pourquoi éviter** :
- Chaque pays = nouvelles sources
- Nouvelles règles (devises, langues)
- Plus de bugs potentiels

**Quand l'ajouter** : Mois 6-12, une fois que la France fonctionne bien.

### ML / IA pour pricing
**Pourquoi éviter** :
- Nécessite beaucoup de données
- Complexité algorithmique
- Difficile à expliquer aux clients

**Quand l'ajouter** : Année 2+, quand on a assez de données historiques.

### Microservices / Architecture complexe
**Pourquoi éviter** :
- Over-engineering
- Plus difficile à maintenir solo
- Pas nécessaire pour V1

**Quand l'ajouter** : Jamais, sauf si vraiment nécessaire (scale).

---

# PARTIE 6 – 3 priorités absolues pour ne pas me perdre

## Priorité #1 : Ship rapidement quelque chose de simple mais utile

**Concrètement** :
- **Mois 1-2** : Scraping + recherche basique fonctionnelle
- **Mois 3** : Prix marché + alertes basiques
- **Mois 4** : Beta testers qui utilisent vraiment le produit

**Pourquoi c'est critique** :
- Un produit qui fonctionne (même simple) > un produit parfait qui n'existe pas
- Les feedbacks de vrais utilisateurs > mes suppositions
- Itérer rapidement > planifier longtemps

**Ce que ça signifie** :
- ✅ Accepter que le design ne soit pas parfait
- ✅ Accepter que certaines features soient basiques
- ✅ Accepter qu'il y ait des bugs mineurs
- ❌ Ne pas attendre que tout soit parfait avant de montrer

**Règle d'or** : Si un marchand peut trouver un véhicule et voir son prix marché, c'est suffisant pour commencer.

---

## Priorité #2 : Parler avec de vrais marchands chaque semaine

**Concrètement** :
- **2-3 appels/semaine** avec des marchands VO
- **Questions à poser** :
  - "Comment tu cherches des véhicules actuellement ?"
  - "Qu'est-ce qui te fait perdre le plus de temps ?"
  - "Comment tu sais si un prix est bon ?"
  - "Qu'est-ce qui te ferait payer pour un outil comme Carindex ?"

**Pourquoi c'est critique** :
- Les marchands savent mieux que moi ce dont ils ont besoin
- Un problème réel > une feature cool
- Un client qui paie > un utilisateur gratuit

**Ce que ça signifie** :
- ✅ Écouter plus que parler
- ✅ Noter tous les feedbacks
- ✅ Prioriser les features demandées par plusieurs clients
- ❌ Ne pas développer des features "parce que c'est cool"

**Règle d'or** : Si 3+ marchands demandent la même chose, c'est une priorité. Sinon, c'est pour plus tard.

---

## Priorité #3 : Ne pas rajouter de nouvelles features tant que les premières ne sont pas adoptées

**Concrètement** :
- **Métrique clé** : Taux d'adoption des features existantes
  - Recherche : % de clients qui font au moins 5 recherches/mois
  - Alertes : % de clients qui ont au moins 1 alerte active
  - Prix marché : % de clients qui consultent le prix marché régulièrement

**Seuil minimum** :
- Si < 50% des clients utilisent une feature → Améliorer cette feature avant d'en ajouter une nouvelle
- Si > 70% des clients utilisent une feature → On peut considérer ajouter une nouvelle feature

**Pourquoi c'est critique** :
- Trop de features = produit complexe = moins d'adoption
- Mieux vaut 3 features bien utilisées que 10 features mal utilisées
- Itérer sur l'existant > ajouter du nouveau

**Ce que ça signifie** :
- ✅ Améliorer l'UX des features existantes
- ✅ Corriger les bugs
- ✅ Optimiser les performances
- ❌ Ajouter une nouvelle feature "parce que c'est tentant"

**Règle d'or** : Si je ne peux pas expliquer pourquoi 70%+ des clients vont utiliser une nouvelle feature, je ne la développe pas.

---

## Ce que je dois explicitement IGNORER même si c'est tentant

### Ignorer #1 : Les demandes "enterprise"
**Exemples** :
- "On veut une API complète pour intégrer notre DMS"
- "On veut un rapport personnalisé pour notre direction"
- "On veut une intégration avec notre CRM"

**Pourquoi ignorer** :
- Cycle de vente très long (6-12 mois)
- Besoin de support technique dédié
- Pas de revenus immédiats
- Détourne le focus du produit core

**Quand y revenir** : Année 2, quand on a 100+ clients et une équipe.

---

### Ignorer #2 : Les features "cool" mais pas utilisées
**Exemples** :
- "On pourrait faire une app mobile native"
- "On pourrait ajouter de l'IA pour détecter les bonnes affaires"
- "On pourrait faire une marketplace B2B"

**Pourquoi ignorer** :
- Pas de demande réelle des clients
- Complexité élevée
- Pas de valeur immédiate
- Détourne le focus

**Quand y revenir** : Si 10+ clients le demandent vraiment.

---

### Ignorer #3 : L'optimisation prématurée
**Exemples** :
- "On devrait optimiser la base de données pour 10M d'annonces"
- "On devrait mettre en place un CDN global"
- "On devrait faire du load balancing"

**Pourquoi ignorer** :
- Over-engineering
- Pas nécessaire pour 50-100 clients
- Coûts inutiles
- Détourne le focus

**Quand y revenir** : Quand on a vraiment un problème de performance (pas avant).

---

### Ignorer #4 : La perfection
**Exemples** :
- "Le design n'est pas assez moderne"
- "Il manque des animations"
- "Les emails d'alertes ne sont pas assez beaux"

**Pourquoi ignorer** :
- Un produit qui fonctionne > un produit beau
- Les clients veulent de la valeur, pas de la beauté
- Perfection = jamais de lancement

**Quand y revenir** : Quand on a 50+ clients payants et du temps.

---

## Récapitulatif des 3 priorités

1. **Ship rapidement** : Produit simple mais utile > Produit parfait qui n'existe pas
2. **Parler avec les clients** : 2-3 appels/semaine avec vrais marchands
3. **Itérer sur l'existant** : Ne pas ajouter de features tant que les premières ne sont pas adoptées

**Si je respecte ces 3 priorités** → Je ne me perds pas, je reste focus, je génère de la valeur rapidement.

---

# Conclusion

Carindex V1 est un **produit ultra focus** :
- ✅ 2-3 sources (LeBonCoin, AutoScout24)
- ✅ 1-2 pays (France + Allemagne si temps)
- ✅ 3 features core (recherche, prix marché, alertes)
- ✅ 2-3 plans simples (Starter, Pro, Plus)
- ✅ Objectif réaliste : 50-100 clients, 5K-10K € MRR en 12 mois

**Pas de bullshit, pas de features enterprise, pas de "VC dream"** : Juste un produit utile que des vrais marchands paient pour utiliser.

**Prochaines étapes** :
1. Mois 1-2 : Scraping + recherche fonctionnelle
2. Mois 3 : Prix marché + alertes + beta testers
3. Mois 4-6 : Premiers clients payants
4. Mois 6-12 : Scalers à 50-100 clients

**Règle d'or** : Si un marchand peut trouver un véhicule et voir son prix marché, c'est suffisant pour commencer à facturer.

---

*Document Carindex V1 Bootstrap - Version 1.0*  
*Date : 2025*







