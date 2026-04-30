import { getStore } from "@netlify/blobs";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export const config = {
  schedule: "30 18,19 * * *",
};

function isToday(dateString) {
  const now = new Date();
  const date = new Date(dateString);

  return (
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  );
}

function addDaysFrom(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days));
  return d;
}

function getDuePlants(plants) {
  const now = new Date();

  return plants.filter((plant) => {
    if (!plant.lastWatered || !plant.frequency) return false;

    if (plant.lastWatered && isToday(plant.lastWatered)) {
      return false;
    }

    const next = addDaysFrom(plant.lastWatered, plant.frequency);
    next.setHours(0, 0, 0, 0);

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    return next <= today;
  });
}

export async function handler() {
  try {
    const store = getStore("gardens");
    const { blobs } = await store.list();

    for (const blob of blobs) {
      const garden = await store.get(blob.key, { type: "json" });

      if (!garden?.subscription || !Array.isArray(garden.plants)) continue;

      const duePlants = getDuePlants(garden.plants);

      for (const plant of duePlants) {
        if (plant.lastEveningReminder && isToday(plant.lastEveningReminder)) {
          continue;
        }

        await webpush.sendNotification(
          garden.subscription,
          JSON.stringify({
            title: "⏰ Recordatorio de riego",
            body: `${plant.name} sigue pendiente · ${
              plant.water || "—"
            } ml recomendados.`,
          })
        );

        plant.lastEveningReminder = new Date().toISOString();
      }

      await store.setJSON(blob.key, {
        ...garden,
        plants: garden.plants,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    console.error("evening-reminders error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error enviando avisos de tarde" }),
    };
  }
}