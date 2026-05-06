const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async () => {
  try {
    const { data, error } = await supabase
      .from("jardines")
      .select("*");

    if (error) {
      throw error;
    }

    for (const garden of data) {
      const plants = garden.plants || [];

      for (const plant of plants) {
        if (!plant.nextWatering) continue;

        const next = new Date(plant.nextWatering);
        const now = new Date();

        const sameDay =
          next.getDate() === now.getDate() &&
          next.getMonth() === now.getMonth() &&
          next.getFullYear() === now.getFullYear();

        if (!sameDay) continue;

        const payload = JSON.stringify({
          title: `🌙 Segundo aviso de riego`,
          body: `${plant.name} sigue pendiente de riego`,
        });

        try {
          await webpush.sendNotification(
            garden.subscription,
            payload
          );
        } catch (e) {
          console.error("push error", e.message);
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
};