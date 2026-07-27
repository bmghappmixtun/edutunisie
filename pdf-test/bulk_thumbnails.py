#!/usr/bin/env python3
"""Bulk thumbnail generator for 15,351 resources.
Pipeline: download PDF (parallel) -> pymupdf render -> JPEG -> upload to Vercel Blob -> update DB.
"""
import os, json, time, requests, fitz
from PIL import Image
import io
import re
import importlib.util
from concurrent.futures import ThreadPoolExecutor, as_completed
from vercel_blob import upload_blob  # if available

spec = importlib.util.spec_from_file_location('m', 'pdf-test/bulk_math_v5.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

TOKEN = 'devmanet-bulk-2026'
BLOB_TOKEN = os.environ.get('BLOB_READ_WRITE_TOKEN', '')
PROXY = 'https://examanet.com/api/blob-teacher'
PROGRESS = '/workspace/edutunisie/pdf-test/bulk_thumbnails_progress.json'

def get_targets():
    r = m.neon_query('''
    SELECT id, "numericId", "fileKey"
    FROM "Resource"
    WHERE "thumbnailKey" IS NULL AND "fileKey" IS NOT NULL
    ORDER BY "numericId"
    ''')
    return [{'id': r[0], 'nid': r[1], 'fileKey': r[2]} for r in r.get('response', [{}])[0].get('data', {}).get('rows', [])]

def download(file_key):
    url = f'{PROXY}/{file_key}'
    r = requests.get(url, headers={'X-Internal-Token': TOKEN}, timeout=60)
    if r.status_code != 200: return None
    return r.content

def render_thumb(pdf_bytes):
    """Render first page to JPEG bytes."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        if len(doc) == 0:
            doc.close()
            return None
        page = doc[0]
        # Scale for ~150 DPI (good quality for thumbnail)
        mat = fitz.Matrix(1.2, 1.2)
        pix = page.get_pixmap(matrix=mat)
        img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        # Resize to max 300x400
        img.thumbnail((300, 400), Image.Resampling.LANCZOS)
        # Convert to white background JPEG
        if img.mode != 'RGB':
            img = img.convert('RGB')
        buf = io.BytesIO()
        img.save(buf, 'JPEG', quality=80)
        doc.close()
        return buf.getvalue()
    except Exception as e:
        return None

def upload_to_blob(jpeg_bytes, file_key):
    """Upload to Vercel Blob via direct PUT."""
    # Use Vercel Blob API directly with token
    # URL pattern: POST /v2/blob/upload
    if not BLOB_TOKEN:
        return None
    import uuid
    # Use the public API: PUT to a new pathname
    pathname = f'thumbnails/{file_key.replace("/", "_").replace(".pdf", "")}-{uuid.uuid4().hex[:8]}.jpg'
    try:
        # Direct Vercel Blob upload
        r = requests.put(
            f'https://blob.vercel-storage.com/{pathname}',
            data=jpeg_bytes,
            headers={
                'Authorization': f'Bearer {BLOB_TOKEN}',
                'Content-Type': 'image/jpeg',
                'x-content-type': 'image/jpeg',
            },
            timeout=30,
        )
        if r.status_code in (200, 201):
            data = r.json()
            return {'url': data.get('url'), 'pathname': pathname}
    except Exception as e:
        pass
    return None

def update_db(rid, thumb_key, thumb_url):
    key_escaped = thumb_key.replace("'", "''")
    url_escaped = thumb_url.replace("'", "''")
    sql = f"""UPDATE "Resource" SET "thumbnailKey" = $${key_escaped}$$, "thumbnailUrl" = $${url_escaped}$$ WHERE id = '{rid}'"""
    m.neon_query(sql)

def process(t):
    nid = str(t['nid'])
    if done.get(nid) == 'ok': return nid, 'skip'
    
    pdf = download(t['fileKey'])
    if not pdf: return nid, 'dl_fail'
    
    jpeg = render_thumb(pdf)
    if not jpeg: return nid, 'render_fail'
    
    blob = upload_to_blob(jpeg, t['fileKey'])
    if not blob: return nid, 'upload_fail'
    
    try:
        update_db(t['id'], blob['pathname'], blob['url'])
        return nid, 'ok'
    except Exception as e:
        return nid, f'db_fail:{str(e)[:30]}'

# Load progress
done = {}
if os.path.exists(PROGRESS):
    with open(PROGRESS) as f: done = json.load(f)

targets = get_targets()
print(f'Total targets: {len(targets)}', flush=True)

start = time.time()
ok = 0
fail = 0
processed = 0

with ThreadPoolExecutor(max_workers=8) as ex:
    futures = {ex.submit(process, t): t for t in targets if str(t['nid']) not in done or done[str(t['nid'])] != 'ok'}
    print(f'Queue: {len(futures)}', flush=True)
    for fut in as_completed(futures):
        nid, status = fut.result()
        processed += 1
        if status == 'ok':
            ok += 1
            done[nid] = 'ok'
        else:
            fail += 1
            done[nid] = status
        if processed % 20 == 0:
            elapsed = time.time() - start
            rate = processed / elapsed if elapsed > 0 else 0
            remaining = (len(futures) - processed) / rate if rate > 0 else 0
            print(f'[{processed}/{len(futures)}] OK:{ok} FAIL:{fail} {rate:.1f}/s ETA {remaining/60:.0f}min', flush=True)
            with open(PROGRESS, 'w') as f: json.dump(done, f)

with open(PROGRESS, 'w') as f: json.dump(done, f)
print(f'\nFinal: {ok} OK, {fail} fail')
