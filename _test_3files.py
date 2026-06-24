import json
import sys
sys.path.insert(0, '/workspace/edutunisie/scripts')
import importlib.util
spec = importlib.util.spec_from_file_location("import_zouari", "/workspace/edutunisie/scripts/import_zouari.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

with open('/tmp/zouari-unique-files.json') as f:
    files = json.load(f)

# Parse first 3
for file_meta in files[:3]:
    file_meta['parsed'] = mod.parse_title_with_node(file_meta['cleanTitle'])

# Connect DB
print("🗄️ Connecting...")
conn = mod.get_db_connection()
mod.fetch_admin_user_id(conn)
teacher_id = mod.ensure_zouari_user(conn)
print(f"👤 Teacher: {teacher_id}\n")

# Process 3 files
for i, file_meta in enumerate(files[:3], 1):
    file_id = file_meta['fileId']
    title = file_meta['cleanTitle']
    print(f"[{i}/3] 📄 {title[:70]}")
    
    try:
        if mod.check_resource_exists(conn, file_id):
            print(f"  ⏭️ Already imported\n")
            mod.STATS['skipped'] += 1
            continue
        
        # Download
        pdf_bytes = mod.download_pdf(file_meta['url'])
        if not pdf_bytes:
            print(f"  ❌ Download failed\n")
            mod.STATS['errors'] += 1
            continue
        orig = len(pdf_bytes)
        print(f"  ⬇️ {orig/1024:.0f} KB")
        
        # Process
        processed = mod.process_pdf(pdf_bytes, None)
        new = len(processed)
        print(f"  🔧 {new/1024:.0f} KB ({(new-orig)/orig*100:+.0f}%)")
        
        # Upload to Blob
        file_path = f"teacher-library/{teacher_id}/imported/{file_id}.pdf"
        pdf_url = mod.upload_to_blob(file_path, processed)
        print(f"  ☁️ {pdf_url[:70]}...")
        
        # Insert
        rid = mod.insert_resource_and_file(conn, file_id, file_meta, processed, pdf_url, teacher_id)
        print(f"  💾 Resource: {rid}\n")
        mod.STATS['db_inserted'] += 1
        
    except Exception as e:
        print(f"  ❌ Error: {e}\n")
        mod.STATS['errors'] += 1
        conn.rollback()
        import traceback
        traceback.print_exc()

print(f"\n📊 Stats: DB inserted={mod.STATS['db_inserted']}, errors={mod.STATS['errors']}")
conn.close()
