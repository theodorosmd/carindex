# Django Parser - Ton propre Django pour Carindex

Projet Django autonome pour gérer tes listings et les importer vers Supabase via Carindex.

## Structure

```
django-parser/
├── parser_project/     # Config Django
├── parser_app/         # Modèle Car + API REST
├── manage.py
└── requirements.txt
```

## Installation

```bash
cd django-parser
python -m venv venv
source venv/bin/activate   # ou venv\Scripts\activate sur Windows
pip install -r requirements.txt
cp .env.example .env
# Éditer .env (base PostgreSQL ou SQLite)
```

## Base de données

**PostgreSQL** (recommandé) - créer la base puis :
```bash
python manage.py migrate
python manage.py createsuperuser
```

**SQLite** (démarrage rapide) - décommenter la config SQLite dans `parser_project/settings.py` :
```bash
python manage.py migrate
python manage.py createsuperuser
```

## Lancer

```bash
python manage.py runserver 8003
```

- Admin : http://localhost:8003/admin/
- API Cars : http://localhost:8003/api/cars/
- Filtre status=OK : http://localhost:8003/api/cars/?status=OK

## Intégration Carindex

Dans `backend/.env` :
```
DJANGO_MOBILEDE_BASE_URL=http://localhost:8003
DJANGO_API_CARS_QUERY=status=OK
```

Puis :
```bash
cd backend
node src/scripts/run-django-import-mobilede.js
```

## Ajouter des véhicules

- Via l'admin : http://localhost:8003/admin/parser_app/car/add/
- Via l'API (script Python, curl, etc.)
- Via un scraper que tu écris (modules dans `parser_app/`)
