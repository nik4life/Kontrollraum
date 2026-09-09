# Kontrollraum

Kontrollraum ist eine intuitive, Local-First Unternehmenssoftware für kleine Betriebe.

## Zielarchitektur

```text
Browser
  ↓
Kontrollraum App / Backend
  ↓
PostgreSQL
```

Jede Installation besitzt ihre eigene PostgreSQL-Datenbank. Die lokale Installation benötigt weder Vercel noch Supabase.

## Synology / Portainer

Der Stack besteht aus drei Diensten:

- `db`: PostgreSQL 17
- `migrate`: One-shot Prisma-Migrationscontainer
- `app`: Next.js Standalone App / Backend

PostgreSQL speichert seine Daten im Docker-Volume `postgres_data`. Docker Compose versieht dieses Volume automatisch mit dem jeweiligen Stack-/Projektnamen. Dadurch bleiben Redeploys derselben Installation persistent, während mehrere Kontrollraum-Stacks auf demselben Docker-Host sauber voneinander getrennt bleiben.

### Environment-Variablen

Siehe `.env.example`.

Mindestens setzen:

```env
POSTGRES_DB=kontrollraum
POSTGRES_USER=kontrollraum
POSTGRES_PASSWORD=EIN_LANGES_URL_SICHERES_PASSWORT
APP_PORT=3010
SESSION_COOKIE_SECURE=false
```

Für `POSTGRES_PASSWORD` beim automatisch zusammengesetzten `DATABASE_URL` am besten ein langes Passwort aus Buchstaben und Ziffern verwenden. Für lokalen Zugriff per HTTP/VPN bleibt `SESSION_COOKIE_SECURE=false`. Bei späterem HTTPS-Betrieb auf `true` setzen.

> Das PostgreSQL-Passwort nach der ersten Initialisierung nicht einfach in Portainer ändern. PostgreSQL übernimmt `POSTGRES_PASSWORD` nur bei einer neuen leeren Datenbank automatisch. Passwortänderungen einer bestehenden DB müssen gezielt in PostgreSQL durchgeführt werden.

### Erster Start

1. Git-Repository in Portainer als Stack verwenden.
2. Environment-Variablen hinterlegen.
3. Stack deployen.
4. `db` startet und wird per `pg_isready` geprüft.
5. `migrate` führt `prisma migrate deploy` aus.
6. Nur wenn die Migration erfolgreich ist, startet `app`.
7. Kontrollraum unter `http://<SYNOLOGY-IP>:3010` öffnen.
8. Beim ersten Aufruf erscheint die Anlage des Administratorkontos.

## Datenbankmigrationen

Migrationen sind Bestandteil des Git-Repositories:

```text
prisma/
  schema.prisma
  migrations/
    20260909190000_initial_local/
      migration.sql
```

Produktiv bzw. auf der Synology wird ausschließlich ausgeführt:

```bash
npx prisma migrate deploy
```

Prisma führt dafür in PostgreSQL die Tabelle `_prisma_migrations`. Bereits erfolgreich ausgeführte Migrationen werden nicht erneut angewendet.

### Gewünschter Entwicklungsablauf

```text
Code / Schema ändern
      ↓
neue Prisma-Migration ins Git-Repo
      ↓
Git push
      ↓
Portainer: Pull & Redeploy
      ↓
PostgreSQL bleibt mit Volume bestehen
      ↓
Migration-Container wendet nur neue Migrationen an
      ↓
neue App-Version startet
```

Ein normaler Redeploy führt weder `prisma migrate reset` noch `prisma db push --force-reset` aus und löscht keine vorhandenen Daten.

## Neue Schemaänderungen entwickeln

In einer Entwicklungsumgebung wird nach einer Änderung an `prisma/schema.prisma` eine neue Migration erzeugt, z. B.:

```bash
npx prisma migrate dev --name add_supplier_reference
```

Anschließend werden **Schema und erzeugter Migrationsordner gemeinsam committed**. Auf Synology läuft weiterhin nur `prisma migrate deploy`.

## Backup

Das persistente Volume schützt vor Container-Redeploys, ist aber kein Backup. Vor späterem Produktivbetrieb sollten regelmäßige PostgreSQL-Backups (`pg_dump`) auf ein separates Synology-Verzeichnis bzw. in Hyper Backup eingeplant werden.

## db_bridge

Die vorhandene `db_bridge` ist ausdrücklich **nicht Bestandteil dieses Stacks**. Sie bleibt separat und kann später optional als kontrollierter Zugriff für ChatGPT/MCP auf lokale Datenbanken angebunden werden.
