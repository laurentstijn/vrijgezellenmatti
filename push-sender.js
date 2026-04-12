#!/usr/bin/env node
/**
 * push-sender.js — Lokale push server voor Vrijgezellen Weekend
 *
 * Gebruik:
 *   node push-sender.js <SESSIECODE>
 *
 * Vereisten:
 *   - service-account.json in dezelfde map (download via Firebase Console)
 *   - npm install firebase-admin
 */

const admin = require('firebase-admin');
const path = require('path');

const SESSION_CODE = process.argv[2];
if (!SESSION_CODE) {
  console.error('❌ Gebruik: node push-sender.js <SESSIECODE>  (bijv. MATTI)');
  process.exit(1);
}

const serviceAccount = require(path.join(__dirname, 'service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const messaging = admin.messaging();

console.log(`🚀 Push-sender gestart voor sessie: ${SESSION_CODE}`);
console.log('📡 Luistert naar Firestore wijzigingen...\n');

let prevLastAlertAt = null;
let prevActiveId = null;
let initialized = false;

async function sendPush(tokens, title, body) {
  if (!tokens.length) {
    console.log('⚠️  Geen push tokens gevonden voor deze sessie.');
    return;
  }

  const message = {
    notification: { title, body },
    webpush: {
      notification: {
        title,
        body,
        icon: 'https://vrijgezellen-8143f.web.app/icon-192.png',
        badge: 'https://vrijgezellen-8143f.web.app/icon-192.png',
        vibrate: [200, 100, 200, 100, 400],
        requireInteraction: true,
        tag: 'vrijgezellen-vraag',
        actions: [{ action: 'open', title: '📲 Open app' }],
      },
      fcmOptions: { link: 'https://vrijgezellen-8143f.web.app/' },
    },
    tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`✅ Push verstuurd: ${response.successCount} ok, ${response.failureCount} mislukt`);

    // Verwijder verlopen tokens uit Firestore
    const toDelete = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          toDelete.push(i);
          console.log(`  🗑️  Ongeldig token verwijderd (index ${i})`);
        } else {
          console.log(`  ⚠️  Fout voor token ${i}: ${r.error?.message}`);
        }
      }
    });
  } catch (err) {
    console.error('❌ FCM fout:', err.message);
  }
}

async function getTokens() {
  const snap = await db
    .collection('sessions')
    .doc(SESSION_CODE)
    .collection('tokens')
    .get();
  return snap.docs.map((d) => d.data().token).filter(Boolean);
}

// Luister naar Firestore wijzigingen
db.collection('sessions')
  .doc(SESSION_CODE)
  .onSnapshot(async (snap) => {
    if (!snap.exists) {
      console.log('⚠️  Sessie bestaat nog niet. Wacht tot iemand de app opent met deze code.');
      return;
    }

    const data = snap.data();

    // Eerste keer: sla huidige waarden op zonder push te sturen
    if (!initialized) {
      prevLastAlertAt = data.lastAlertAt || 0;
      prevActiveId = data.activeId || null;
      initialized = true;
      console.log(`📋 Huidige staat: activeId=${prevActiveId}, lastAlertAt=${prevLastAlertAt}`);
      console.log('✨ Klaar! Push wordt verstuurd zodra de host een vraag activeert of melding stuurt.\n');
      return;
    }

    const tokens = await getTokens();

    // Host heeft "Stuur melding" gedrukt
    if (data.lastAlertAt && data.lastAlertAt !== prevLastAlertAt) {
      prevLastAlertAt = data.lastAlertAt;
      console.log('\n🔔 Host stuurde een melding! Push versturen...');
      await sendPush(tokens, '🔔 Opgelet!', 'De host heeft een melding gestuurd. Open de app!');
    }

    // Host heeft een vraag geactiveerd
    if (data.activeId && data.activeId !== prevActiveId) {
      prevActiveId = data.activeId;
      const activeQ = (data.questions || []).find((q) => q.id === data.activeId);
      const questionText = activeQ?.text?.slice(0, 100) || 'Open de app voor de volgende vraag!';
      console.log(`\n❓ Nieuwe vraag actief: "${questionText}". Push versturen...`);
      await sendPush(tokens, '❓ Nieuwe vraag!', questionText);
    }
  }, (err) => {
    console.error('❌ Firestore fout:', err.message);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Push-sender gestopt.');
  process.exit(0);
});
