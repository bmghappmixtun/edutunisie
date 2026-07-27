#!/usr/bin/env python3
"""Worker that calls /api/admin/generate-thumbnails for each resource.
This bypasses the need for BLOB_READ_WRITE_TOKEN because the endpoint uses
Vercel OIDC.
"""
import os, json, time, requests
import importlib.util

spec = importlib.util.spec_from_file_location('m', 'pdf-test/bulk_math_v5.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

TOKEN = 'devmanet-bulk-2026'
URL = 'https://examanet.com/api/admin/generate-thumbnails'
PROGRESS = '/workspace/edutunisie/pdf-test/thumb_worker_progress.json'

# Load progress
done = {}
if os.path.exists(PROGRESS):
    with open(PROGRESS) as f: done = json.load(f)

# Get targets
print('Loading targets...', flush=True)
r = m.neon_query('''
SELECT id, "numericId", "fileKey"
FROM "Resource"
WHERE "thumbnailKey" IS NULL AND "fileKey" IS NOT NULL
ORDER BY "numericId"
''')
targets = [{'id': r[0], 'nid': r[1], 'fileKey': r[2]} for r in r.get('response', [{}])[0].get('data', {}).get('rows', [])]
print(f'Total: {len(targets)}, remaining: {sum(1 for t in targets if str(t["nid"]) not in done or done[str(t["nid"])] != "ok")}', flush=True)

start = time.time()
ok = 0
fail = 0
processed = 0

for t in targets:
    nid = str(t['nid'])
    if done.get(nid) == 'ok':
        continue
    
    try:
        resp = requests.post(URL, 
            json={'fileKey': t['fileKey'], 'resourceId': t['id']},
            headers={'X-Internal-Token': TOKEN},
            timeout=120
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get('status') == 'ok':
                ok += 1
                done[nid] = 'ok'
            else:
                fail += 1
                done[nid] = data.get('status', 'unknown')
        else:
            fail += 1
            done[nid] = f'http_{resp.status_code}'
    except Exception as e:
        fail += 1
        done[nid] = f'exc:{str(e)[:30]}'
    
    processed += 1
    if processed % 50 == 0:
        elapsed = time.time() - start
        rate = processed / elapsed if elapsed > 0 else 0
        remaining = (len(targets) - processed - sum(1 for v in done.values() if v == 'ok')) / rate if rate > 0 else 0
        print(f'[{processed}/{len(targets)}] OK:{ok} FAIL:{fail} {rate:.1f}/s ETA {remaining/60:.0f}min', flush=True)
        with open(PROGRESS, 'w') as f: json.dump(done, f)

with open(PROGRESS, 'w') as f: json.dump(done, f)
print(f'\nFinal: {ok} OK, {fail} fail')
