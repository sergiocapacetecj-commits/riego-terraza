const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method not allowed",
      };
    }

    const body = JSON.parse(event.body || "{}");

    const { endpoint, subscription, plants } = body;

    if (!endpoint || !subscription) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing endpoint or subscription",
        }),
      };
    }

    const { error } = await supabase
      .from("jardines")
      .upsert({
        endpoint,
        subscription,
        plants: plants || [],
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error(error);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: error.message,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
      }),
    };
  } catch (err) {
    console.error("save-garden error", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
};