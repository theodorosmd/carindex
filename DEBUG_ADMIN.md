# 🔍 Debug du Dashboard Admin

## Problème
Le dashboard admin affiche "Chargement..." indéfiniment.

## Solutions à essayer

### 1. Vérifier que le backend est démarré

```bash
cd backend
npm run dev
```

Le serveur doit tourner sur `http://localhost:3001`

### 2. Vérifier le token JWT

Le problème le plus probable : **votre token JWT ne contient pas le rôle admin** car vous vous êtes connecté AVANT d'avoir le rôle admin.

**Solution :**
1. **Déconnectez-vous** complètement
2. **Reconnectez-vous** avec `theodoredignet@gmail.com`
3. Un nouveau token sera généré avec le rôle `admin`

### 3. Vérifier dans la console du navigateur

1. Ouvrez la console (F12)
2. Allez dans l'onglet "Console"
3. Rechargez la page
4. Vous devriez voir des messages comme :
   - `📊 Admin stats response status: 200` (succès)
   - `❌ Admin stats error: ...` (erreur)
   - `✅ Admin stats data: ...` (données reçues)

### 4. Tester l'endpoint directement

Ouvrez la console du navigateur (F12) et tapez :

```javascript
// Récupérer le token
const token = localStorage.getItem('carindex_token');

// Tester l'endpoint admin
fetch('/api/v1/admin/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log('✅ Réponse:', data))
.catch(err => console.error('❌ Erreur:', err));
```

**Résultats possibles :**

- **Status 200** : L'API fonctionne, le problème est dans le frontend
- **Status 403** : Vous n'avez pas le rôle admin (reconnectez-vous)
- **Status 401** : Token invalide ou expiré (reconnectez-vous)
- **Erreur réseau** : Le backend n'est pas démarré

### 5. Vérifier le rôle dans le token

Dans la console du navigateur :

```javascript
// Décoder le token JWT (sans vérification)
const token = localStorage.getItem('carindex_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Rôle dans le token:', payload.role);
console.log('Token complet:', payload);
```

Si `payload.role` n'est pas `'admin'`, vous devez vous reconnecter.

### 6. Vérifier le rôle dans la base de données

```bash
cd backend
node src/scripts/check-user-role.js theodoredignet@gmail.com
```

Vous devriez voir :
```
Role: admin
```

Si ce n'est pas le cas, exécutez le SQL dans Supabase (voir `SET_ADMIN_NOW.sql`).

---

## Solution rapide (recommandée)

1. **Exécutez le SQL** dans Supabase (voir `SET_ADMIN_NOW.sql`)
2. **Déconnectez-vous** de l'application
3. **Reconnectez-vous** avec `theodoredignet@gmail.com`
4. **Rechargez** le dashboard admin (F5)

Cela générera un nouveau token JWT avec le rôle admin.







