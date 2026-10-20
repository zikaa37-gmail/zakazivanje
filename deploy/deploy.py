"""Automatski deploy na cPanel preko FTP-a (bez SSH-a).

    python deploy/deploy.py                 # build (sa testovima) + upload koda + .env
    python deploy/deploy.py --skip-tests    # build bez backend testova
    python deploy/deploy.py --skip-build    # samo upload postojećih paketa
    python deploy/deploy.py --with-db       # i uvoz deploy/zakazivanje-baza.sql (briše podatke na serveru!)

Podešavanja (FTP_*, DEPLOY_*) i produkcioni .env su u deploy/.env (van gita).
Zipovi i .env idu preko FTP-a, a jednokratni PHP fajl (deploy/remote-unpack.php, zaštićen
DEPLOY_SECRET-om) ih na serveru raspakuje, obriše keš i sam sebe.
"""

import ftplib
import json
import os
import secrets
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEPLOY = ROOT / 'deploy'
DEPLOY_ONLY_PREFIXES = ('FTP_', 'DEPLOY_')


def read_env(path: Path) -> tuple[dict, list[str]]:
    values, lines = {}, path.read_text(encoding='utf-8').splitlines()
    for line in lines:
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"')
    return values, lines


def server_env(lines: list[str]) -> bytes:
    kept = [line for line in lines if not line.split('=', 1)[0].strip().startswith(DEPLOY_ONLY_PREFIXES)]
    while kept and (kept[-1].startswith('#') or not kept[-1].strip()):
        kept.pop()
    return ('\n'.join(kept) + '\n').encode('utf-8')


def upload(ftp: ftplib.FTP, data: bytes | Path, remote: str) -> None:
    size = data.stat().st_size if isinstance(data, Path) else len(data)
    print(f'  -> {remote} ({size / 1024 / 1024:.1f} MB)')
    if isinstance(data, Path):
        with data.open('rb') as handle:
            ftp.storbinary(f'STOR {remote}', handle, blocksize=256 * 1024)
    else:
        import io
        ftp.storbinary(f'STOR {remote}', io.BytesIO(data))


def bash() -> str:
    git = shutil.which('git')
    if os.name == 'nt' and git:
        for folder in Path(git).resolve().parents:
            candidate = folder / 'bin' / 'bash.exe'
            if candidate.exists() and (folder / 'usr').exists():
                return str(candidate)
    return 'bash'


HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
    'Accept': 'application/json, text/html;q=0.9, */*;q=0.8',
}


def tls() -> ssl.SSLContext:
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def get(url: str) -> int:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30, context=tls()) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def main() -> int:
    sys.stdout.reconfigure(encoding='utf-8')
    args = set(sys.argv[1:])
    env, lines = read_env(DEPLOY / '.env')
    for key in ('FTP_HOST', 'FTP_USER', 'FTP_PASSWORD', 'DEPLOY_APP_DIR', 'DEPLOY_WEB_DIR', 'DEPLOY_SECRET', 'APP_URL'):
        if not env.get(key):
            print(f'Nedostaje {key} u deploy/.env')
            return 1

    if '--skip-build' not in args:
        command = [bash(), str(DEPLOY / 'build-release.sh')] + (['--skip-tests'] if '--skip-tests' in args else [])
        print('==> Build:', ' '.join(command[1:]))
        subprocess.run(command, cwd=ROOT, check=True)

    app_zip, web_zip, sql = DEPLOY / 'zakazivanje-app.zip', DEPLOY / 'zakazivanje-web.zip', DEPLOY / 'zakazivanje-baza.sql'
    for path in (app_zip, web_zip) + ((sql,) if '--with-db' in args else ()):
        if not path.exists():
            print(f'Nema {path.name} — pokreni bez --skip-build')
            return 1

    unpacker_name = f'_deploy-{secrets.token_hex(8)}.php'
    unpacker = (DEPLOY / 'remote-unpack.php').read_text(encoding='utf-8') \
        .replace('__DEPLOY_SECRET__', env['DEPLOY_SECRET']) \
        .replace('__DEPLOY_APP_DIR__', env['DEPLOY_APP_DIR'])

    app_dir, web_dir = env['DEPLOY_APP_DIR'], env['DEPLOY_WEB_DIR']
    print(f"==> FTP upload ({env['FTP_HOST']})")
    ftp = ftplib.FTP(timeout=120)
    ftp.connect(env['FTP_HOST'], int(env.get('FTP_PORT') or 21))
    ftp.login(env['FTP_USER'], env['FTP_PASSWORD'])
    upload(ftp, app_zip, f'{app_dir}/_deploy-app.zip')
    upload(ftp, server_env(lines), f'{app_dir}/_deploy.env')
    if '--with-db' in args:
        upload(ftp, sql, f'{app_dir}/_deploy-db.sql')
    upload(ftp, web_zip, f'{web_dir}/_deploy-web.zip')
    upload(ftp, unpacker.encode('utf-8'), f'{web_dir}/{unpacker_name}')
    ftp.quit()

    base = env['APP_URL'].rstrip('/')
    print('==> Raspakivanje na serveru')
    request = urllib.request.Request(f'{base}/{unpacker_name}', data=urllib.parse.urlencode({'key': env['DEPLOY_SECRET']}).encode(), headers=HEADERS, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=600, context=tls()) as response:
            result = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as error:
        result = {'ok': False, 'error': f'HTTP {error.code}: {error.read()[:300].decode("utf-8", "replace")}'}
    print('  ', result)
    if not result.get('ok'):
        return 1

    print('==> Provera')
    checks = {'sajt': get(f'{base}/'), 'api': get(f'{base}/api/health')}
    print('  ', checks)
    if any(status != 200 for status in checks.values()):
        return 1

    print('Deploy je završen.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
