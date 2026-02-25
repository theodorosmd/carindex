# Carindex - Guide de Démarrage

## Prérequis

- Node.js 18+ 
- PostgreSQL 14+
- Redis (optionnel, pour les queues)
- Docker & Docker Compose (pour le monitoring)

## Installation

### 1. Backend API

```bash
cd backend
npm install
cp .env.example .env
# Configurez vos variables d'environnement
npm run dev
```

Le serveur API démarre sur `http://localhost:3001`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Le frontend démarre sur `http://localhost:3000`

### 3. Base de données

```bash
# Créez la base de données
createdb carindex

# Exécutez le schéma
psql carindex < backend/src/database/schema.sql
```

### 4. Configuration Apify

1. Créez un compte sur [Apify](https://apify.com)
2. Créez un nouvel Actor depuis `apify/actors/autoscout24-scraper`
3. Configurez les schedules selon `APIFY_SETUP.md`
4. Ajoutez votre token Apify dans `.env`:
   ```
   APIFY_API_TOKEN=your_token_here
   ```

### 5. Monitoring

```bash
cd monitoring
docker-compose up -d
```

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

## Structure du Projet

```
carindex/
├── frontend/          # Site marketing (Vite + Tailwind)
├── backend/           # API REST (Express.js)
├── apify/             # Actors Apify pour scraping
├── monitoring/        # Prometheus + Grafana
└── docs/              # Documentation
```

## Variables d'Environnement

Voir `CONFIGURATION.md` pour la liste complète des variables.

## Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## Déploiement

### Production

1. Configurez les variables d'environnement
2. Build le frontend: `cd frontend && npm run build`
3. Déployez le backend (Heroku, AWS, etc.)
4. Configurez le monitoring
5. Activez les schedules Apify

## Support

- Documentation: Voir les fichiers `.md` à la racine
- Email: tech@carindex.com









