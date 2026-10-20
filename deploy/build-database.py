import datetime
import glob
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL_DIR = os.path.join(ROOT, 'sql')
TARGET = os.path.join(ROOT, 'deploy', 'zakazivanje-baza.sql')
ATTEMPTS = 3
MYSQL_BIN = os.environ.get('MYSQL_BIN', r'C:\Program Files\MySQL\MySQL Server 8.0\bin')

SCHEMA_ONLY = {
    'zk_cache', 'zk_cache_locks', 'zk_sessions', 'zk_jobs', 'zk_job_batches', 'zk_failed_jobs',
    'zk_refresh_tokens', 'zk_password_reset_tokens',
}

KEEP_SERVER_DATA = set()

PRELUDE = """SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
"""

POSTLUDE = """
SET FOREIGN_KEY_CHECKS=1;
"""


def env_value(env, key):
    match = re.search(rf'^{key}=(.*)$', env, re.M)
    return match.group(1).strip().strip('"') if match else ''


def connection():
    env = open(os.path.join(ROOT, 'backend', '.env'), encoding='utf-8').read()
    args = ['-h', env_value(env, 'DB_HOST'), '-P', env_value(env, 'DB_PORT'), '-u', env_value(env, 'DB_USERNAME')]
    process_env = dict(os.environ, MYSQL_PWD=env_value(env, 'DB_PASSWORD'))
    return args, process_env, env_value(env, 'DB_DATABASE')


def run(tool, args, process_env):
    for attempt in range(1, ATTEMPTS + 1):
        result = subprocess.run([os.path.join(MYSQL_BIN, tool)] + args, env=process_env, capture_output=True)
        if result.returncode == 0:
            return result.stdout.decode('utf-8')
        if attempt < ATTEMPTS:
            time.sleep(attempt)
    sys.exit(result.stderr.decode('utf-8', 'replace'))


def dump_table(table, with_data, args, process_env, database):
    options = [
        '--default-character-set=utf8mb4', '--single-transaction', '--compact', '--add-drop-table',
        '--set-gtid-purged=OFF', '--column-statistics=0', '--no-tablespaces', '--skip-triggers',
        '--extended-insert', '--hex-blob',
    ]
    if not with_data:
        options.append('--no-data')
    sql = run('mysqldump.exe', args + options + [database, table], process_env)
    if not with_data:
        sql = re.sub(r' AUTO_INCREMENT=\d+', '', sql)
    return sql.strip() + '\n'


def main():
    args, process_env, database = connection()
    tables = run('mysql.exe', args + ['-N', '-e', f"SHOW TABLES FROM `{database}` LIKE 'zk\\_%'"], process_env).split()
    last_migration = run('mysql.exe', args + ['-N', '-e', f'SELECT MAX(migration) FROM `{database}`.`zk_migrations`'], process_env).strip()
    today = datetime.date.today().strftime('%d.%m.%Y')

    for old in glob.glob(os.path.join(SQL_DIR, 'zk_*.sql')):
        os.remove(old)

    migration_parts = []
    counts = []
    for table in tables:
        with_data = table not in SCHEMA_ONLY
        sql = dump_table(table, with_data, args, process_env, database)
        rows = sql.count('),(') + sql.count('INSERT INTO') if with_data else 0
        counts.append((table, rows))

        with open(os.path.join(SQL_DIR, f'{table}.sql'), 'w', encoding='utf-8', newline='\n') as file:
            file.write(f'-- Tabela `{table}`: šema i podaci iz lokalne baze ({today}). Generiše deploy/build-database.py.\n\n')
            file.write(PRELUDE + '\n' + sql + POSTLUDE)

        if table in KEEP_SERVER_DATA:
            schema = dump_table(table, False, args, process_env, database)
            schema = schema.replace('DROP TABLE IF EXISTS', '-- DROP TABLE IF EXISTS').replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS')
            migration_parts.append(f'-- {table}: podaci sa servera se zadržavaju (KEEP_SERVER_DATA)\n{schema}')
        else:
            migration_parts.append(f'-- {table}\n{sql}')

    kept = ', '.join(sorted(KEEP_SERVER_DATA)) or 'nijedna'
    header = f"""-- Zakazivanje — migracija baze {today} (cPanel → phpMyAdmin → baza fiskultu_porucivanje → Import).
--
-- Jedan fajl koji bazu na serveru dovodi u isto stanje kao lokalnu bazu:
--   * za svaku `zk_` tabelu: DROP + CREATE po najnovijoj šemi (prazna tabela, ID-jevi kreću iz početka)
--     pa unos podataka iz lokalne baze — ID-jevi su isti kao lokalno;
--   * šema odgovara svim migracijama do {last_migration} (zk_migrations je popunjen),
--     pa `php artisan migrate` posle importa nije potreban;
--   * keš, sesije, poslovi, refresh tokeni i reset lozinki su prazni (svi se ponovo prijavljuju);
--   * nalozi i lozinke su iz lokalne baze;
--   * tabele čiji se podaci na serveru zadržavaju (KEEP_SERVER_DATA): {kept}.
-- Tabele drugih aplikacija u istoj bazi (bez prefiksa `zk_`) se NE diraju.
--
-- Pravi se sa: bash deploy/build-release.sh (ili python deploy/build-database.py).

"""
    with open(TARGET, 'w', encoding='utf-8', newline='\n') as file:
        file.write(header + PRELUDE + '\n' + '\n'.join(migration_parts) + POSTLUDE)

    print(f'{TARGET}: {len(tables)} tabela, {os.path.getsize(TARGET) // 1024} KB, poslednja migracija {last_migration}')
    print(f'{SQL_DIR}: {len(tables)} fajlova po tabelama')


if __name__ == '__main__':
    main()
