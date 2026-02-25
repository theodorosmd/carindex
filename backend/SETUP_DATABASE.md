# Configuration de la Base de Données

## Problème
La migration a échoué car PostgreSQL n'est pas accessible.

## Solutions

### Option 1: Démarrer PostgreSQL (macOS avec Homebrew)

```bash
# Démarrer PostgreSQL
brew services start postgresql@14
# ou
brew services start postgresql@15
# ou
brew services start postgresql@16

# Vérifier que c'est démarré
pg_isready
```

### Option 2: Démarrer PostgreSQL (macOS avec Postgres.app)

Si vous utilisez Postgres.app, lancez simplement l'application.

### Option 3: Créer la base de données

Une fois PostgreSQL démarré, créez la base de données :

```bash
# Se connecter à PostgreSQL
psql postgres

# Dans le terminal PostgreSQL, exécutez :
CREATE DATABASE carindex;
\q
```

### Option 4: Utiliser Docker

```bash
# Démarrer PostgreSQL avec Docker
docker run --name carindex-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=carindex \
  -p 5432:5432 \
  -d postgres:15

# Attendre quelques secondes que PostgreSQL démarre
sleep 5
```

## Exécuter la Migration

Une fois PostgreSQL démarré et la base de données créée :

```bash
cd backend
node src/scripts/run-migration.js
```

## Vérifier la Configuration

Assurez-vous que votre fichier `.env` contient :

```env
DATABASE_URL=postgresql://localhost:5432/carindex
```

Si vous utilisez un utilisateur/mot de passe différent :

```env
DATABASE_URL=postgresql://username:password@localhost:5432/carindex
```

## Initialiser le Schéma de Base

Si c'est la première fois, initialisez aussi le schéma principal :

```bash
cd backend
node src/scripts/init-db.js
```

Puis exécutez la migration :

```bash
node src/scripts/run-migration.js
```








