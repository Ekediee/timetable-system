import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = path.join(os.tmpdir(), `alloc_${Date.now()}_${file.name}`);
    await fs.writeFile(tempPath, buffer);

    const pyScript = `
import zipfile, xml.etree.ElementTree as ET, json, re, sys

file_path = sys.argv[1]
try:
    with zipfile.ZipFile(file_path) as z:
        tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        
        current_prog = "General"
        current_sem = "First Semester"
        programs = {}
        
        for r in tree.findall('.//s:row', ns):
            cells = {}
            for c in r.findall('s:c', ns):
                ref = c.attrib.get('r', '')
                col = ''.join([ch for ch in ref if ch.isalpha()])
                v = c.find('s:v', ns)
                val = v.text if v is not None else None
                is_elem = c.find('s:is', ns)
                if is_elem is not None:
                    t = is_elem.find('s:t', ns)
                    if t is not None:
                        val = t.text
                cells[col] = val
            
            a = cells.get('A')
            if a and '▶ Semester:' in a:
                current_sem = a.split('▶ Semester:')[1].strip()
            elif a and '• Program:' in a:
                current_prog = a.split('• Program:')[1].strip()
                if current_prog not in programs:
                    programs[current_prog] = []
            elif cells.get('C') and cells.get('C') != 'Course Code' and current_prog:
                code = cells.get('C', '').strip()
                title = cells.get('D', '').strip()
                unit_str = cells.get('E', '2').strip()
                group = cells.get('F', '').strip()
                lecturer = cells.get('G', '').strip()
                lecturer = re.sub(r'\\s+', ' ', lecturer)
                
                digits = re.findall(r'\\d+', code)
                level = '200 Level'
                if digits:
                    num = int(digits[0])
                    if num >= 100 and num < 200:
                        level = '100 Level'
                    elif num >= 200 and num < 300:
                        level = '200 Level'
                    elif num >= 300 and num < 400:
                        level = '300 Level'
                    elif num >= 400:
                        level = '400 Level'
                
                c_type = 'Core'
                is_virtual = False
                if 'GST' in code or 'GEDS' in code:
                    c_type = 'GST'
                    is_virtual = True
                elif 'ENT' in code:
                    c_type = 'Elective'
                
                units = int(unit_str) if unit_str.isdigit() else 2
                size = 55
                if group == 'All':
                    size = 180
                
                if current_prog not in programs:
                    programs[current_prog] = []
                programs[current_prog].append({
                    'code': code,
                    'title': title,
                    'lecturer': lecturer,
                    'units': max(1, units),
                    'size': size,
                    'type': c_type,
                    'group': group,
                    'level': level,
                    'isVirtual': is_virtual
                })
        
        print(json.dumps({'success': True, 'programs': programs}))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}))
`;

    const result = await new Promise<string>((resolve, reject) => {
      execFile("python3", ["-c", pyScript, tempPath], (error, stdout) => {
        fs.unlink(tempPath).catch(() => {});
        if (error) reject(error);
        else resolve(stdout);
      });
    });

    const parsed = JSON.parse(result);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

