import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { subscription, plants } = body;

    if (!subscription?.endpoint) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Falta subscription" }),
      };
    }

    const store = getStore("gardens");

    const id = encodeURIComponent(subscription.endpoint);

    await store.setJSON(id, {
      subscription,
      plants: Array.isArray(plants) ? plants : [],
      updatedAt: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    console.error("save-garden error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No se pudo guardar el jardín" }),
    };
  }
}