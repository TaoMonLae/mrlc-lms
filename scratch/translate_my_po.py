import os
import re
import time
from deep_translator import GoogleTranslator

po_path = '/Users/taomonlae/Downloads/mrlc-lms/src/i18n/locales/my.po'

def escape_po(s):
    return (s.replace('\\', '\\\\')
             .replace('"', '\\"')
             .replace('\n', '\\n')
             .replace('\r', '\\r')
             .replace('\t', '\\t'))

def unescape_po(s):
    return (s.replace('\\"', '"')
             .replace('\\n', '\n')
             .replace('\\r', '\r')
             .replace('\\t', '\t')
             .replace('\\\\', '\\'))

def unquote(raw):
    start = raw.find('"')
    end = raw.rfind('"')
    if start == -1 or end <= start:
        return ""
    return unescape_po(raw[start+1:end])

def parse_po(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    entries = []
    header = {}
    current_comments = []
    msgid = None
    msgstr = None
    mode = None

    def commit():
        nonlocal msgid, msgstr, current_comments, mode
        if msgid is not None and msgstr is not None:
            if msgid == '':
                for ln in msgstr.split('\n'):
                    idx = ln.find(':')
                    if idx > 0:
                        header[ln[:idx].strip()] = ln[idx+1:].strip()
            else:
                entries.append({
                    'id': msgid,
                    'str': msgstr,
                    'comments': list(current_comments)
                })
        msgid = None
        msgstr = None
        current_comments = []
        mode = None

    lines = content.splitlines()
    for raw_line in lines:
        line = raw_line.strip()
        if line == '':
            commit()
            continue
        if line.startswith('#'):
            current_comments.append(raw_line)
            continue
        if line.startswith('msgid'):
            if mode == 'str':
                commit()
            msgid = unquote(line[5:])
            mode = 'id'
            continue
        if line.startswith('msgstr'):
            after = re.sub(r'^msgstr(\[\d+\])?', '', line)
            msgstr = unquote(after)
            mode = 'str'
            continue
        if line.startswith('"'):
            piece = unquote(line)
            if mode == 'id':
                msgid = (msgid or "") + piece
            elif mode == 'str':
                msgstr = (msgstr or "") + piece
            continue
    commit()
    return header, entries

def mask_text(text):
    placeholders = []
    
    def repl(m, prefix):
        idx = len(placeholders)
        placeholders.append((prefix, m.group(0)))
        return f" __PH_{prefix}_{idx}__ "

    # 1. Template literal ${...}
    text = re.sub(r'\$\{[a-zA-Z0-9_.]+\}', lambda m: repl(m, 'tmpl'), text)
    # 2. JSX brackets {...}
    text = re.sub(r'\{[a-zA-Z0-9_.]+\}', lambda m: repl(m, 'brac'), text)
    # 3. HTML entities &...;
    text = re.sub(r'&[a-zA-Z0-9#]+;', lambda m: repl(m, 'entity'), text)
    # 4. Special chars
    text = re.sub(r'[✓•·→…—–]', lambda m: repl(m, 'char'), text)
    
    return text, placeholders

def unmask_text(text, placeholders):
    res = text
    for idx in range(len(placeholders) - 1, -1, -1):
        prefix, orig = placeholders[idx]
        pattern = rf'\s*__\s*[pP][hH]\s*_\s*{prefix}\s*_\s*{idx}\s*__\s*'
        res = re.sub(pattern, orig, res, flags=re.IGNORECASE)
    return res

def translate_batch(batch_strings):
    translator = GoogleTranslator(source='en', target='my')
    masked_batch = []
    batch_placeholders = []
    for s in batch_strings:
        masked, ph = mask_text(s)
        masked_batch.append(masked)
        batch_placeholders.append(ph)
        
    try:
        translated_batch = translator.translate_batch(masked_batch)
    except Exception as e:
        print(f"Batch translation failed: {e}. Falling back to individual translation...")
        translated_batch = []
        for ms in masked_batch:
            try:
                translated_batch.append(translator.translate(ms))
                time.sleep(0.3)
            except Exception as ex:
                print(f"Failed to translate '{ms}': {ex}")
                translated_batch.append(ms)
                
    final_translations = []
    for t, ph in zip(translated_batch, batch_placeholders):
        if not t:
            t = ""
        unmasked = unmask_text(t, ph)
        final_translations.append(unmasked)
        
    return final_translations

def main():
    print(f"Parsing {po_path}...")
    header, entries = parse_po(po_path)
    print(f"Loaded {len(entries)} entries from PO file.")
    
    untranslated_indices = [i for i, entry in enumerate(entries) if entry['str'] == '']
    print(f"Found {len(untranslated_indices)} untranslated entries.")
    
    if not untranslated_indices:
        print("No translation needed.")
        return
        
    BATCH_SIZE = 30
    total = len(untranslated_indices)
    
    for i in range(0, total, BATCH_SIZE):
        chunk_indices = untranslated_indices[i:i+BATCH_SIZE]
        chunk_strings = [entries[idx]['id'] for idx in chunk_indices]
        
        print(f"Translating batch {i // BATCH_SIZE + 1} / {(total + BATCH_SIZE - 1) // BATCH_SIZE} ({len(chunk_strings)} strings)...")
        translated_strings = translate_batch(chunk_strings)
        
        for idx, trans in zip(chunk_indices, translated_strings):
            entries[idx]['str'] = trans
            
        time.sleep(1.0) # sleep 1 second between batches
        
    # Write back to PO file
    print(f"Writing updated entries back to {po_path}...")
    output = 'msgid ""\nmsgstr ""\n'
    for k, v in header.items():
        output += f'"{k}: {escape_po(v)}\\n"\n'
    output += '\n'
    
    for entry in entries:
        for c in entry['comments']:
            output += f"{c}\n"
        output += f'msgid "{escape_po(entry["id"])}"\n'
        output += f'msgstr "{escape_po(entry["str"])}"\n\n'
        
    with open(po_path, 'w', encoding='utf-8') as f:
        f.write(output)
        
    print("Translation completed successfully!")

if __name__ == '__main__':
    main()
