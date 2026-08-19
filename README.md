# Kontrollraum

Arbeitstitel für eine intuitive, Local-First Unternehmenssoftware für kleine Betriebe.

## Produktidee

Kontrollraum begleitet den zentralen Betriebsablauf:

**Kunde → Angebot → Auftrag → Leistung → Rechnung → Zahlung → Buchhaltung**

Die Oberfläche richtet sich nach der Rolle des Benutzers. Mitarbeiter sehen nur, was sie für ihre Arbeit benötigen. Der wichtigste Produktfokus ist der automatisierte Übergang von dokumentierter Arbeit zu einem prüfbaren Rechnungsvorschlag.

## V0.1

Der erste Prototyp enthält bewusst Demo-Daten, damit Oberfläche und Workflow ohne Infrastrukturhürde getestet werden können:

- responsive Chef-, Monteur- und Buchhaltungsansicht
- aufgabenorientiertes Dashboard
- Auftragsübersicht
- mobile Arbeitsdokumentation
- Angebot-vs.-Rechnungsvorschlag
- Abweichungs-/Nachtragsprüfung
- kaufmännische Freigabe als Demo-Interaktion
- Kundenübersicht

## Architekturziel

Die Produktionsarchitektur bleibt Self-Hosted und Local-First:

- Next.js / TypeScript
- PostgreSQL
- Docker-fähige Kundeninstallation
- eine Installation und Datenbank pro Betrieb
- keine zwingende Cloudabhängigkeit
- optionale externe Dienste für Banking, E-Mail, DATEV, Updates usw.

Das Prisma-Schema unter `prisma/schema.prisma` bildet den ersten fachlichen Kern ab. Die aktuelle UI nutzt noch keine Datenbank, damit der visuelle und fachliche Workflow zuerst schnell iteriert werden kann.

## Lokal starten

```bash
npm install
npm run dev
```

Danach `http://localhost:3000` öffnen.

## Datenbank später anbinden

Für PostgreSQL wird eine `DATABASE_URL` benötigt. Beispiel:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/kontrollraum"
```

Die Demo-Seeds und Migrationen folgen, sobald der erste UI-/Workflow-Stand bestätigt ist.
