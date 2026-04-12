const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

/**
 * Luistert naar wijzigingen in een sessiedocument.
 * Als lastAlertAt of activeId verandert, stuur push naar alle tokens.
 */
exports.sendPushOnSessionChange = onDocumentUpdated(
  "sessions/{sessionCode}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    const alertChanged = after.lastAlertAt && after.lastAlertAt !== before.lastAlertAt;
    const activeChanged = after.activeId && after.activeId !== before.activeId;

    if (!alertChanged && !activeChanged) return null;

    const db = getFirestore();
    const sessionCode = event.params.sessionCode;

    // Haal alle push tokens op voor deze sessie
    const tokensSnap = await db
      .collection("sessions")
      .doc(sessionCode)
      .collection("tokens")
      .get();

    if (tokensSnap.empty) {
      console.log("Geen tokens gevonden voor sessie:", sessionCode);
      return null;
    }

    const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);
    if (!tokens.length) return null;

    // Bouw het bericht op
    let title = "🎉 Vrijgezellen Weekend";
    let body = "Open de app voor de volgende vraag!";

    if (activeChanged) {
      const activeQ = (after.questions || []).find((q) => q.id === after.activeId);
      if (activeQ?.text) {
        title = "❓ Nieuwe vraag!";
        body = activeQ.text.slice(0, 120);
      }
    } else if (alertChanged) {
      title = "🔔 Opgelet!";
      body = "De host heeft een melding gestuurd.";
    }

    const message = {
      notification: { title, body },
      data: {
        sessionCode,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      webpush: {
        notification: {
          title,
          body,
          icon: "./icon-192.png",
          badge: "./icon-192.png",
          vibrate: [200, 100, 200, 100, 400],
          requireInteraction: true,
          tag: "vrijgezellen-vraag",
          actions: [{ action: "open", title: "Open app" }],
        },
        fcmOptions: { link: "./" },
      },
      tokens,
    };

    console.log(`Sending push to ${tokens.length} devices for session ${sessionCode}`);

    const response = await getMessaging().sendEachForMulticast(message);

    // Verwijder ongeldige tokens
    const toDelete = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          toDelete.push(tokensSnap.docs[i].ref);
        }
      }
    });

    if (toDelete.length) {
      const batch = db.batch();
      toDelete.forEach((ref) => batch.delete(ref));
      await batch.commit();
      console.log(`Verwijderd ${toDelete.length} ongeldige token(s)`);
    }

    console.log(
      `Succesvol: ${response.successCount}, Mislukt: ${response.failureCount}`
    );
    return null;
  }
);
