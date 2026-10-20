import os
import sys
import zipfile

source, target = sys.argv[1], sys.argv[2]

if os.path.exists(target):
    os.remove(target)

count = 0
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for folder, _, files in os.walk(source):
        for name in files:
            path = os.path.join(folder, name)
            archive.write(path, os.path.relpath(path, source).replace(os.sep, '/'))
            count += 1

print(f'{target}: {count} fajlova')
