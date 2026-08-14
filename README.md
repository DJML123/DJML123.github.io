# OnSpot

Live-Streams, Events und Orte auf einer Karte – von deiner Straße bis Tokio.

**Live: [djml123.github.io](https://djml123.github.io/)**

Eine Expo-App (iOS, Android, Web) aus einer Codebasis. Die Karte ist eine
MapLibre-Satellitenansicht mit eigenen POI-Symbolen; dazu kommen ein
TikTok-artiger Video-Feed, Chats, Coins und ein Avatar-Editor.

## Schnellstart

```bash
npm install
npm run web
```

Die App läuft danach auf <http://localhost:8081> (bzw. dem Port, den Expo
meldet). Für iOS/Android stattdessen `npm run ios` oder `npm run android`.

> **Standort auf dem Handy:** Browser geben GPS nur über HTTPS frei. Über
> `http://192.168.x.x:8081` bleibt nur die grobe IP-Position. `npm run web:tunnel`
> startet die App über eine HTTPS-Adresse, dann funktioniert der genaue Standort.

## Skripte

| Befehl | Wofür |
| --- | --- |
| `npm run web` | Web-Entwicklung im Browser |
| `npm run web:tunnel` | wie oben, aber über HTTPS (nötig für GPS auf dem Handy) |
| `npm run ios` / `npm run android` | Entwicklung auf Simulator/Gerät |
| `npm test` | Jest-Tests (Coins, Repository, Spenden) |
| `npm run lint` | ESLint über das gesamte Projekt |
| `npx tsc --noEmit` | Typprüfung |

## Aufbau

```
src/
  app/            Bildschirme (expo-router: index, onboarding, +html)
  components/
    map/          MapLibre-Karte, POI-Ebene, Marker, Detail-Sheet
    feed/         Video-Feed
    ui/           Sheets, Modals und gemeinsame Bausteine
  constants/      React-Contexts (Auth, Coins, Prefs, Social, …)
  services/       Repository, Supabase-Anbindung, Zahlungen, Sync
supabase/         SQL-Schema und Edge Functions
public/           Dateien, die unverändert ins Web-Bundle kopiert werden
```

Die Karte zeichnet ihre POIs selbst (`src/components/map/poi-layer.ts`): rund
hundert OpenMapTiles-Klassen werden auf fünfzehn Kategorien abgebildet, und
Kategorie bestimmt Symbol, Farbe und ab welchem Zoom ein Ort erscheint. Läden
und Gastronomie kommen zuerst, alles Übrige erst weiter hineingezoomt, Haltestellen
zuletzt.

## Backend (optional)

Ohne Konfiguration läuft alles lokal: der Zustand liegt in AsyncStorage bzw.
localStorage, es geht nichts an einen Server.

Für echte Synchronisierung:

1. Projekt auf <https://supabase.com/dashboard> anlegen
2. `supabase/schema.sql` im SQL-Editor ausführen
3. `.env.example` nach `.env` kopieren und Projekt-URL sowie **anon public**
   Key eintragen (niemals den `service_role` Key)
4. Edge Functions bereitstellen:
   ```bash
   supabase functions deploy grant-coins redeem-iap
   ```

Coins werden ausschließlich serverseitig gutgeschrieben – die Beträge stehen in
den Edge Functions, nicht im Client, und `grant_log` verhindert doppelte
Gutschriften.

> **Zahlungen sind Demo.** Abo und Spenden zeigen den Ablauf, es ist kein
> Zahlungsanbieter angebunden und es wird nichts abgebucht.

## Deployment

Jeder Push auf `main` baut über `.github/workflows/deploy.yml` mit
`npx expo export --platform web` und veröffentlicht `dist/` auf GitHub Pages.

Damit die veröffentlichte Seite Supabase nutzt, müssen die beiden Variablen als
Repository-Secrets hinterlegt sein – der Workflow reicht sie bereits durch:

```bash
gh secret set EXPO_PUBLIC_SUPABASE_URL
gh secret set EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Ohne die Secrets baut der Workflow weiterhin durch, die Seite läuft dann nur
lokal. `EXPO_PUBLIC_*` landet im ausgelieferten Bundle – beim anon Key ist das
so vorgesehen, RLS schützt die Daten. Der `service_role` Key gehört **niemals**
hierher.

## Lizenz

**Alle Rechte vorbehalten.** Kein Open Source.

Die App unter [djml123.github.io](https://djml123.github.io/) darf jeder
benutzen, und der Quellcode darf gelesen werden. Kopieren, Verändern,
Weiterverbreiten, Selbst-Hosten oder Verkaufen ist ohne schriftliche
Zustimmung nicht gestattet – siehe [LICENSE](LICENSE).

Für die verwendeten Bibliotheken, Kartendaten (OpenStreetMap, ODbL),
Kartenkacheln (OpenFreeMap, Esri) und Piktogramme (Maki, CC0) gelten die
Lizenzen ihrer jeweiligen Urheber.
