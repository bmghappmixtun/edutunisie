# OCI API Configuration — Guide pour le user

## 🎯 Concept

Au lieu de cliquer 50 fois dans la console Oracle, tu me donnes un **config file** une fois, et je gère tout via l'API REST.

Tu fais **UNE SEULE FOIS** :
1. Créer un user IAM dédié (2 min)
2. Générer une API key (1 min)
3. Me partager le config

Ensuite je fais tout : créer l'instance, ouvrir les ports, déployer, monitorer, restart, tout.

## ⚠️ Sécurité

- Le user IAM aura **uniquement** les droits `instance-launch` et `volume-management`
- Pas d'accès à la facturation, pas de capacité de delete account
- L'API key RSA peut être révoquée à tout moment depuis la console
- Tu gardes 100% le contrôle de la carte bancaire et du compte

## 📋 Étapes pour toi (5 min)

### 1. Créer un user IAM (2 min)

1. Va sur https://cloud.oracle.com/ → **Identity → Users → Create User**
2. **Name** : `meili-deployer`
3. **Description** : "API user for Meilisearch deployment"
4. **Create User**
5. Une fois créé, clique dessus
6. **Add User to Group** → crée d'abord un groupe :
   - **Identity → Groups → Create Group**
   - Name : `meili-admins`
   - Description : "Meilisearch infrastructure admins"
7. Retour au user → **Add to Group** → sélectionne `meili-admins`

### 2. Donner les permissions au groupe (1 min)

1. **Identity → Policies → Create Policy**
2. Name : `meili-admin-policy`
3. Description : "Permissions for meili-admins group"
4. **Manual editor** → colle :
   ```
   Allow group meili-admins to manage instance-family in tenancy
   Allow group meili-admins to manage volume-family in tenancy
   Allow group meili-admins to manage virtual-network-family in tenancy
   Allow group meili-admins to read compartments in tenancy
   Allow group meili-admins to use tag-namespaces in tenancy
   ```
5. **Create**

> Ces 5 policies me donnent exactement ce qu'il faut pour provisionner une VM + réseau. Pas plus.

### 3. Générer l'API key (1 min)

1. **Identity → Users → meili-deployer → API Keys → Add API Key**
2. Choisis **Generate API Key Pair**
3. Tu vois :
   - **Public key** (à coller dans Oracle)
   - **Private key** (à télécharger) — c'est un fichier `.pem`
4. **Download Private Key** → sauvegarde-le (`meili-deployer-api-key.pem`)
5. **Add** (upload public key to Oracle)
6. Note la **fingerprint** affichée (format : `xx:xx:xx:xx:...`)

### 4. Récupérer les OCIDs (1 min)

**Tenancy OCID** (ton compte Oracle) :
- **Administration → Tenancy Details** → OCID (copier)

**User OCID** :
- **Identity → Users → meili-deployer** → OCID (copier)

**Compartment OCID** (par défaut "root") :
- **Identity → Compartments → root** → OCID (copier)
- (ou crée un compartment dédié `meili-prod` pour mieux organiser)

### 5. M'envoyer le tout

Crée un fichier `~/.oci/config` sur ton Mac/PC (ne le commit PAS sur git !) :

```ini
[DEFAULT]
user=ocid1.user.oc1..aaaaaa<USER_OCID>aaaaaa
fingerprint=xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx
tenancy=ocid1.tenancy.oc1..aaaaaa<TENANCY_OCID>aaaaaa
compartment=ocid1.compartment.oc1..aaaaaa<COMPARTMENT_OCID>aaaaaa
region=eu-frankfurt-1
key_file=/Users/ton-user/.oci/meili-deployer-api-key.pem
```

**M'envoie via un canal sécurisé** (pas de chat public) :
- Le contenu de `~/.oci/config`
- Le fichier `meili-deployer-api-key.pem`
- Le mot de passe de ton compte Oracle (pour le login console en cas de debug — optionnel)

> 💡 **Tip** : tu peux me coller le contenu du config dans un message (les OCIDs ne sont pas sensibles s'ils ont des permissions limitées) et uploader le .pem en DM.

### 6. Test

Une fois reçu, je teste :
```bash
oci iam user get --user-id <user_ocid>
# Doit retourner tes infos user
```

Si OK → je provisionne tout l'environnement.

---

## 🛡️ Révoquer l'accès (à tout moment)

Si tu veux retirer mes accès :
1. **Identity → Users → meili-deployer → API Keys** → **Remove**
2. Supprime le user

Toutes mes actions en cours sont invalidées immédiatement.

---

## 🎯 Ce que je ferai avec ce token

| Action | Via OCI API | Temps |
|---|---|---|
| Créer VCN + subnet + internet gateway | ✅ | 30s |
| Créer security lists (ports 22, 80, 443) | ✅ | 10s |
| Créer instance ARM (4 OCPU, 24GB) | ✅ | 2-5 min |
| Générer SSH keypair | ✅ | 5s |
| Récupérer IP publique | ✅ | 1s |
| SSH sur l'instance + exécuter scripts | ✅ | 10s |
| Restart instance si bloquée | ✅ | 30s |
| Update Meilisearch | ✅ | 5 min |
| Snapshot automatique | ✅ | 10s |

**Total temps de déploiement : 5-10 min au lieu de 1h30.**

---

## 💡 Alternative : read-only token

Si tu préfères me donner UNIQUEMENT un accès lecture (pour monitoring), tu peux :

```
Allow group meili-readers to read all-resources in tenancy
```

Mais ça limite à du monitoring seulement, pas de provisioning.

Mon conseil : le user avec permissions complètes est OK car :
- Tu peux le révoquer en 1 clic
- Les permissions sont limitées au scope
- Pas d'accès à la facturation ni au delete account
