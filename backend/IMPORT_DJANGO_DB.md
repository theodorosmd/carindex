# Import direct Django DB → Supabase

Import des listings mobile.de depuis la base PostgreSQL Django, **sans passer par l'API HTTP**. Beaucoup plus rapide que l'import API (10 véhicules/page).

## Prérequis

1. **Accès réseau** à la base PostgreSQL Django
   - Le port 5432 n'est souvent pas exposé (firewall, PostgreSQL écoute sur localhost)
   - **Solution : tunnel SSH** (à lancer dans un terminal séparé)
     ```bash
     ssh -L 5433:localhost:5432 user@75.119.141.234
     ```
     Puis dans `.env` :
     ```
     DJANGO_DB_HOST=localhost
     DJANGO_DB_PORT=5433
     ```

2. **Nom de la table** Django pour les voitures
   - Par défaut : `parser_app_car` (Django : app_label + model_name en minuscules)
   - Pour vérifier : dans Django `python manage.py shell` → `Car._meta.db_table`

## Configuration (.env)

```env
# Connexion base Django (mobile.de)
DJANGO_DB_HOST=75.119.141.234
DJANGO_DB_PORT=5432
DJANGO_DB_NAME=parser_db
DJANGO_DB_USER=postgres
DJANGO_DB_PASSWORD=xxx

# Optionnel
DJANGO_DB_TABLE=parser_app_car    # table des voitures
DJANGO_DB_STATUS=OK               # importer uniquement status='OK' (~887k)
DJANGO_DB_BATCH=1000              # taille des lots
DJANGO_DB_LIMIT=0                 # 0 = tout, ou 5000 pour test
```

## Lancement

```bash
cd backend

# Test avec 1000 lignes
DJANGO_DB_LIMIT=1000 node src/scripts/run-django-db-import-mobilede.js

# Dry-run (aucune écriture Supabase)
node src/scripts/run-django-db-import-mobilede.js --dry-run

# Import complet (~887k en status OK)
npm run import:django-db
```

## Découvrir le schéma Django

Si les noms de colonnes diffèrent, exécuter dans `psql` ou Django shell :

```sql
-- Lister les colonnes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'parser_app_car'
ORDER BY ordinal_position;
```

Ajuster ensuite `rowToCar()` dans `run-django-db-import-mobilede.js` si nécessaire.
