import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function handler(event) {
  try {
    const { subscription } = JSON.parse(event.body || "{}");

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "🌿 Jardín",
        body: "Notificación real funcionando 🚀",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: "Error enviando push",
    };
  }
}