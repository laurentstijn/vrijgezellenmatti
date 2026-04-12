# Vrijgezellen PWA push ready

Deze map bevat een PWA-versie met push-voorbereiding.

## Wat is al klaar
- manifest
- service worker
- Firebase Messaging setup in de app
- firebase-messaging-sw.js
- onthouden van rol en sessie
- deeplink met `?role=` en `?code=`

## Wat jij nog moet doen
1. Upload alle bestanden in deze map naar de root van je GitHub repo.
2. Vervang je huidige `index.html` door deze `index.html`.
3. Open Firebase Console.
4. Ga naar **Cloud Messaging**.
5. Maak of kopieer je **Web Push certificate / VAPID key**.
6. Zoek in `index.html`:
   `const VAPID_KEY = "PASTE_YOUR_VAPID_KEY_HERE";`
   en plak daar je echte key.
7. Commit opnieuw naar GitHub.
8. Open de app in Safari op iPhone.
9. Kies **Deel > Zet op beginscherm**.
10. Open de app vanaf het beginscherm.
11. Klik op **Meldingen aanzetten**.

## Belangrijk
Deze versie maakt wel een push token aan, maar om echte pushberichten te sturen moet je nog een manier hebben om Firebase Cloud Messaging een bericht te laten verzenden naar dat token.

Dat kan op 2 manieren:
- via een kleine serverfunctie / Cloud Function
- of handmatig vanuit Firebase / een eigen script

## Voor dit weekend
Gebruik deze versie als voorbereiding.
De huidige live simpele versie blijft het meest praktisch om nu te testen.
