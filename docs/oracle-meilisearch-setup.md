# Guide complet : Déployer Meilisearch sur Oracle Cloud Free Tier

**Coût : $0/mois à vie** (Oracle Cloud Always Free + Meilisearch MIT)

## ⏱️ Temps total : 30-45 minutes

---

## Étape 0 : Créer le compte Oracle Cloud (10 min)

1. Va sur **https://cloud.oracle.com/**
2. Clique **Start for Free**
3. Remplis le formulaire :
   - Email (utilise le même que pour Examanet)
   - **Cloud Account Name** : `examanet` (sera ton subdomain Oracle)
   - **Home Region** : `eu-frankfurt-1` (le plus proche de la Tunisie)
4. **Vérifie ton email** (code à 6 chiffres envoyé)
5. **Mot de passe** : 12+ caractères, majuscule + minuscule + chiffre + spécial
6. Saisis les infos de facturation
   - ⚠️ **Carte bancaire REQUISE** mais **JAMAIS débitée** (juste vérification identité)
   - Tu peux utiliser une carte Revolut, N26, ou ta carte perso
7. Choisis le **Always Free tier** uniquement

> **Note** : Si tu vois des écrans d'upgrade "Upgrade to Pay-as-you-go", IGNORE-LES. Tu peux toujours rester en free tier même avec un compte "Pay-as-you-go" tant que tu ne dépasses pas les limites.

---

## Étape 1 : Créer l'instance ARM (5 min)

1. Console → **Compute → Instances → Create Instance**
2. **Name** : `examanet-meili`
3. **Placement** : laisse par défaut
4. **Image and shape** :
   - Image : **Oracle Linux 8** (ou **Ubuntu 22.04** si plus familier)
   - Shape : **VM.Standard.A1.Flex** (ARM, Always Free)
   - **OCPU count** : 4
   - **Memory (GB)** : 24
5. **Networking** : 
   - Crée un nouveau VCN (par défaut)
   - Subnet : laisse par défaut
6. **SSH Keys** :
   - Choisis **Generate a key pair**
   - **Télécharge les 2 clés** (private + public)
   - Sauve `ssh-key-*.key` dans un endroit sûr
7. **Boot volume** : laisse par défaut (50 GB, Always Free)
8. **Create**

> ⚠️ **Important** : si tu vois "Out of capacity for shape VM.Standard.A1.Flex in availability domain", c'est que la région est saturée. Solutions :
> - Essaie un autre availability domain (1, 2, ou 3)
> - Essaie Frankfurt ou Amsterdam (eu-frankfurt-1, eu-amsterdam-1)
> - Réessaie dans 1-2h (capacités se libèrent régulièrement)

---

## Étape 2 : Ouvrir les ports réseau (5 min)

⚠️ **CRITIQUE** : Oracle Cloud bloque TOUS les ports par défaut, même 80/443. Il faut ouvrir.

1. Console → **Networking → Virtual Cloud Networks**
2. Clique sur ton VCN (créé avec l'instance)
3. **Subnets** → clique sur le subnet public
4. **Security Lists** → Default Security List
5. **Add Ingress Rules** :
   - Source CIDR : `0.0.0.0/0`
   - Protocol : TCP
   - Destination Port : `22` (SSH, déjà là normalement)
   - **Add another rule** :
     - Source CIDR : `0.0.0.0/0`
     - Protocol : TCP
     - Destination Port : `80`
   - **Add another rule** :
     - Source CIDR : `0.0.0.0/0`
     - Protocol : TCP
     - Destination Port : `443`
6. Save

**Important** : Ne JAMAIS ouvrir le port 7700 (Meilisearch) en public — il reste sur localhost, derrière Nginx.

---

## Étape 3 : Se connecter à l'instance (2 min)

Sur ton Mac/PC :
```bash
chmod 600 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key opc@<PUBLIC_IP>
```

L'IP publique est visible dans la console : Compute → Instances → Public IP.

> Tu devrais voir `[opc@examanet-meili ~]$` une fois connecté.

---

## Étape 4 : Setup DNS (5 min)

Avant de continuer, tu dois pointer un sous-domaine vers cette IP.

Choisis un sous-domaine, par exemple `search.examanet.com`.

1. Va sur ton registrar DNS (Cloudflare, Namecheap, OVH, etc.)
2. Crée un **A record** :
   - Name : `search`
   - Value : `<PUBLIC_IP>` (l'IP de ton instance Oracle)
   - TTL : 300 (5 min)
3. Attends 2-5 min que la propagation se fasse

Teste :
```bash
nslookup search.examanet.com
# Doit retourner ton IP Oracle
```

---

## Étape 5 : Bootstrap du serveur (5 min)

Sur l'instance, en SSH :

```bash
sudo -i
cd /root
# Télécharge les scripts (ou copie-colle depuis le repo edutunisie)
git clone https://github.com/bmghappmixtun/edutunisie.git
cd edutunisie/scripts/oracle-setup
chmod +x *.sh *.mjs

# Bootstrap
./01-server-bootstrap.sh
```

Ce script :
- Update le système
- Installe nginx, certbot, fail2ban
- Configure UFW (firewall)
- Crée un user `meilisearch`
- Configure 1GB swap

---

## Étape 6 : Installer Meilisearch (2 min)

```bash
./02-install-meilisearch.sh
```

Ce script :
- Télécharge Meilisearch v1.10.0
- Génère un master key sécurisé
- Crée un service systemd
- Démarre Meilisearch

**⚠️ IMPORTANT** : copie le master key affiché à la fin dans un password manager. Tu en auras besoin pour :
- Configurer Vercel
- Réindexer
- Administrer

Teste :
```bash
curl http://127.0.0.1:7700/health
# → {"status":"available"}
```

---

## Étape 7 : SSL + reverse proxy (5 min)

```bash
./03-setup-ssl.sh search.examanet.com
```

Remplace `search.examanet.com` par ton sous-domaine. Le script va :
- Te demander de confirmer que le DNS est OK
- Configurer Nginx comme reverse proxy
- Obtenir un certificat Let's Encrypt
- Activer le renouvellement auto
- Créer un cron pour snapshots quotidiens

Teste :
```bash
curl https://search.examanet.com/health
# → {"status":"available"}
```

---

## Étape 8 : Sync des 15,333 resources (5-10 min)

```bash
# Créer le dossier sync
mkdir -p /root/meili-sync
cd /root/meili-sync

# Installer les deps
npm init -y
npm install meilisearch @prisma/client dotenv

# Copier .env depuis edutunisie
cp /root/edutunisie/.env.local .env

# Copier le script
cp /root/edutunisie/scripts/oracle-setup/04-sync-resources.mjs .

# Set public URL
export MEILI_PUBLIC_URL=search.examanet.com
export MEILI_URL=http://127.0.0.1:7700
export MEILI_MASTER_KEY=$(cat /root/.meili-master-key)

# Lancer le sync
node 04-sync-resources.mjs
```

Tu verras :
```
1. Creating/resetting index...
2. Configuring index settings...
3. Counting resources...
   Total resources in DB: 15,333
4. Syncing resources in batches...
   ✓ 1,000/15,333 (250 docs/s)
   ✓ 2,000/15,333 (290 docs/s)
   ...
   ✓ 15,333/15,333 (310 docs/s)
5. Final verification...
✅ Sync complete in 47.3s!
```

Teste une recherche :
```bash
curl -H "Authorization: Bearer $MEILI_MASTER_KEY" \
  "https://search.examanet.com/indexes/resources/search?q=devoir&limit=2" | python3 -m json.tool
```

---

## Étape 9 : Setup monitoring (2 min)

```bash
cd /root/edutunisie/scripts/oracle-setup
./06-monitoring.sh
```

Configure :
- Health check toutes les 5 min (auto-restart si down)
- Daily snapshots
- Alertes push via ntfy.sh (gratuit)

**Optionnel** : Va sur https://ntfy.sh/examanet-meili-alerts et abonne-toi pour recevoir des alertes sur ton téléphone.

---

## Étape 10 : Connecter Examanet (Vercel) (5 min)

1. Va sur Vercel Dashboard → ton projet Examanet
2. **Settings → Environment Variables** → Add :
   - `MEILI_URL` = `https://search.examanet.com`
   - `MEILI_MASTER_KEY` = (le master key copié à l'étape 6)
3. **Deployments** → Trigger redeploy
4. L'app est maintenant branchée sur Meilisearch.

---

## Étape 11 : Activer le live sync (Prisma → Meilisearch)

Dans ton app Next.js, ajoute le hook de sync :

```ts
// src/lib/meili-sync.ts (copie de scripts/oracle-setup/05-prisma-hook.ts)
```

Puis dans tes API routes qui modifient des resources :
```ts
// src/app/api/admin/resources/route.ts
import { syncResource } from '@/lib/meili-sync';

const resource = await prisma.resource.create({ data });
await syncResource('create', resource);
```

---

## ✅ Setup complet !

Tu as maintenant :
- ✅ Meilisearch sur Oracle Cloud Free Tier (24GB RAM, gratuit à vie)
- ✅ SSL via Let's Encrypt
- ✅ Reverse proxy Nginx
- ✅ Snapshots quotidiens + 7 jours de rétention
- ✅ Auto-restart si crash
- ✅ Monitoring + alertes
- ✅ 15,333 resources indexées en ~50 secondes
- ✅ Latence sub-50ms

**Coût total : $0/mois** 🎉

---

## 🔧 Maintenance

| Tâche | Fréquence | Effort |
|---|---|---|
| Vérifier les alertes | quotidien | 30 sec |
| Vérifier la santé | hebdo | 2 min |
| Renouveler SSL | auto (certbot) | 0 |
| Update Meilisearch | mensuel (5 min) | 5 min |
| Backup snapshot | auto (cron 3am) | 0 |
| Scale up si nécessaire | manuel | 10 min |

**Update Meilisearch** :
```bash
# 1. Sur l'instance
systemctl stop meilisearch
curl -L https://github.com/meilisearch/meilisearch/releases/latest/download/meilisearch-linux-aarch64 -o /usr/local/bin/meilisearch
chmod +x /usr/local/bin/meilisearch
systemctl start meilisearch
meilisearch --version
```

---

## 🆘 Troubleshooting

### "Out of capacity" sur la création d'instance
- Réessaie dans 1-2h
- Essaie un autre availability domain
- Essaie une autre région (eu-frankfurt-1, eu-amsterdam-1)

### SSL ne s'obtient pas
- Vérifie que le DNS pointe bien vers l'IP : `nslookup search.examanet.com`
- Vérifie que le port 80 est ouvert dans Oracle Security List
- Teste : `curl http://search.examanet.com/.well-known/acme-challenge/test`

### Meilisearch ne répond pas
- `systemctl status meilisearch`
- Logs : `journalctl -u meilisearch -f`
- Restart : `systemctl restart meilisearch`

### Sync trop lent
- Augmente la RAM : Oracle te laisse 24GB, alloue 8GB à Meilisearch si besoin
- Change le `BATCH_SIZE` dans le script de sync

### Latence élevée
- Vérifie la région de l'instance vs tes users
- Active Cloudflare CDN devant (en option)

---

## 📊 Limites du free tier à connaître

| Resource | Limite free | Notre usage |
|---|---|---|
| ARM OCPUs | 4 max | 4 (on est au max) |
| RAM | 24 GB max | 24 GB (on est au max) |
| Storage | 200 GB total | ~50 GB utilisé |
| Outbound data | 10 TB/mois | ~10-20 GB/mois (largement OK) |
| Instances ARM | 1 par tenant | 1 |

⚠️ Oracle peut te demander de "justifier" l'usage free tier une fois par an. Réponds que c'est pour un projet éducatif non-commercial (ça passe).

---

## 🎓 Bonus : command utiles au quotidien

```bash
# Status rapide
systemctl status meilisearch

# Stats de l'index
/usr/local/bin/meili-stats.sh

# Restart propre
systemctl restart meilisearch

# Logs en temps réel
journalctl -u meilisearch -f

# Espace disque
df -h /var/lib/meilisearch

# Process info
htop

# Taille de l'index
du -sh /var/lib/meilisearch/data.ms

# Backup manuel
curl -X POST -H "Authorization: Bearer $MEILI_MASTER_KEY" \
  http://127.0.0.1:7700/snapshots

# Reindex (depuis zéro)
cd /root/meili-sync && node 04-sync-resources.mjs
```