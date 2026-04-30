import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STORAGE_KEY = "jardin-capacete-v2";
const PUSH_STORAGE_KEY = "push-subscription";

const SEVILLA = {
  latitude: 37.3891,
  longitude: -5.9845,
};

const STAGES = {
  seed: {
    label: "Semilla",
    emoji: "🌱",
    waterMultiplier: 0.35,
    frequencyMultiplier: 0.5,
    note:
      "Mantén el sustrato húmedo, pero sin encharcar. Mejor riegos ligeros o pulverización.",
  },
  young: {
    label: "Creciendo",
    emoji: "🌿",
    waterMultiplier: 0.7,
    frequencyMultiplier: 0.8,
    note:
      "Necesita humedad regular mientras desarrolla raíz y hojas. Ajusta según calor y tamaño de maceta.",
  },
  mature: {
    label: "Madura",
    emoji: "🌳",
    waterMultiplier: 1,
    frequencyMultiplier: 1,
    note:
      "Riego base según especie, clima y exposición. Revisa siempre el sustrato antes de regar.",
  },
};

const plantLibrary = [
  {
    name: "Albahaca",
    category: "Aromáticas",
    location: "Terraza · semisombra",
    frequency: 2,
    water: 250,
    stage: "mature",
    notes:
      "Mantener el sustrato ligeramente húmedo. En Sevilla conviene vigilarla más en días de calor intenso.",
    emoji: "🌿",
  },
  {
    name: "Hierbabuena",
    category: "Aromáticas",
    location: "Terraza · semisombra",
    frequency: 2,
    water: 300,
    stage: "mature",
    notes:
      "Necesita humedad regular. Evita que el sustrato se seque por completo.",
    emoji: "🍃",
  },
  {
    name: "Perejil",
    category: "Aromáticas",
    location: "Terraza · sol suave",
    frequency: 2,
    water: 220,
    stage: "mature",
    notes:
      "Mejor con luz abundante pero sin sol extremo. Mantener humedad constante sin encharcar.",
    emoji: "🌱",
  },
  {
    name: "Tomillo",
    category: "Aromáticas mediterráneas",
    location: "Terraza · pleno sol",
    frequency: 5,
    water: 160,
    stage: "mature",
    notes:
      "Planta mediterránea. Necesita poco riego, mucho sol y excelente drenaje.",
    emoji: "🪴",
  },
];

function createInitialPlants() {
  return [];
}

function normalizePlant(plant) {
  return {
    stage: "mature",
    history: [],
    lastWatered: new Date().toISOString(),
    ...plant,
  };
}

function addDaysFrom(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days));
  return d;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function getStageInfo(stage) {
  return STAGES[stage] || STAGES.mature;
}

function getWeatherFactor(weather) {
  if (!weather) {
    return {
      factor: 1,
      label: "Sin datos de clima",
      reason: "La app usará el riego base hasta cargar la previsión.",
      urgency: "neutral",
    };
  }

  const { maxTemp, rain, wind } = weather;

  if (rain >= 2) {
    return {
      factor: 0.55,
      label: "Lluvia prevista",
      reason: "Reducimos el riego recomendado.",
      urgency: "ok",
    };
  }

  if (maxTemp >= 36 || wind >= 28) {
    return {
      factor: 1.35,
      label: "Calor/viento fuerte",
      reason: "Aumentamos el agua y conviene revisar sustrato.",
      urgency: "danger",
    };
  }

  if (maxTemp >= 30) {
    return {
      factor: 1.2,
      label: "Calor moderado",
      reason: "Ligero aumento de riego por evaporación.",
      urgency: "warning",
    };
  }

  return {
    factor: 1,
    label: "Clima estable",
    reason: "Se mantiene el riego base.",
    urgency: "ok",
  };
}

function getPlantSensitivity(plant) {
  if (["Albahaca", "Hierbabuena", "Perejil"].includes(plant.name)) return 1;
  if (["Tomillo"].includes(plant.name)) return 0.55;
  return 0.8;
}

function getAdjustedWater(plant, weather) {
  const normalizedPlant = normalizePlant(plant);
  const stageInfo = getStageInfo(normalizedPlant.stage);
  const weatherFactor = getWeatherFactor(weather).factor;
  const sensitivity = getPlantSensitivity(normalizedPlant);

  const climateAdjusted =
    normalizedPlant.water * (1 + (weatherFactor - 1) * sensitivity);

  const stageAdjusted = climateAdjusted * stageInfo.waterMultiplier;

  return Math.max(25, Math.round(stageAdjusted / 5) * 5);
}

function getAdjustedFrequency(plant, weather) {
  const normalizedPlant = normalizePlant(plant);
  const stageInfo = getStageInfo(normalizedPlant.stage);

  let baseFrequency = normalizedPlant.frequency * stageInfo.frequencyMultiplier;

  if (weather?.rain >= 2) baseFrequency += 1;

  if (
    weather?.maxTemp >= 36 &&
    ["Albahaca", "Hierbabuena", "Perejil"].includes(normalizedPlant.name)
  ) {
    baseFrequency -= 1;
  }

  return Math.max(1, Math.round(baseFrequency));
}

function getNextWateringDate(plant, weather) {
  const normalizedPlant = normalizePlant(plant);
  return addDaysFrom(
    normalizedPlant.lastWatered,
    getAdjustedFrequency(normalizedPlant, weather)
  );
}

function getStatus(plant, weather) {
  const normalizedPlant = normalizePlant(plant);
  const nextDate = getNextWateringDate(normalizedPlant, weather);
  const diff = daysUntil(nextDate);

  if (
    weather?.maxTemp >= 36 &&
    ["Albahaca", "Hierbabuena", "Perejil"].includes(normalizedPlant.name)
  ) {
    return { label: "Urgente", className: "status danger" };
  }

  if (diff < 0) return { label: "Atrasado", className: "status danger" };
  if (diff === 0) return { label: "Hoy toca", className: "status soon" };
  if (diff === 1) return { label: "Mañana", className: "status review" };

  return { label: `En ${diff} días`, className: "status ok" };
}

async function fetchPlantImage(plantName) {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY;

  if (!apiKey || !plantName) return null;

  const query = encodeURIComponent(`${plantName} planta aromática`);
  const url = `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape&locale=es-ES`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const photo = data?.photos?.[0];

    if (!photo) return null;

    return {
      image: photo.src.large,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      pexelsUrl: photo.url,
    };
  } catch {
    return null;
  }
}

function getStandaloneStatus() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function buildBackendPlants(plants, weather) {
  return plants.map((plant) => {
    const normalizedPlant = normalizePlant(plant);

    return {
      ...normalizedPlant,
      water: getAdjustedWater(normalizedPlant, weather),
      frequency: getAdjustedFrequency(normalizedPlant, weather),
      nextWatering: getNextWateringDate(normalizedPlant, weather).toISOString(),
      stageLabel: getStageInfo(normalizedPlant.stage).label,
    };
  });
}

export default function App() {
  const [plants, setPlants] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved
        ? JSON.parse(saved).map((plant) => normalizePlant(plant))
        : createInitialPlants();
    } catch {
      return createInitialPlants();
    }
  });

  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [isStandalone, setIsStandalone] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  const [draft, setDraft] = useState({
    name: "",
    category: "",
    location: "Terraza",
    frequency: 2,
    water: 250,
    stage: "mature",
    notes: "",
    emoji: "🌱",
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
  }, [plants]);

  useEffect(() => {
    setIsStandalone(getStandaloneStatus());
  }, []);

  useEffect(() => {
    async function loadWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${SEVILLA.latitude}&longitude=${SEVILLA.longitude}&daily=temperature_2m_max,precipitation_sum,wind_speed_10m_max&timezone=Europe%2FMadrid&forecast_days=1`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("No se pudo obtener el clima.");
        }

        const data = await response.json();

        setWeather({
          maxTemp: Math.round(data.daily.temperature_2m_max[0]),
          rain: Number(data.daily.precipitation_sum[0] || 0),
          wind: Math.round(data.daily.wind_speed_10m_max[0] || 0),
        });
      } catch {
        setWeatherError("No se pudo cargar el clima. Usando riego base.");
      }
    }

    loadWeather();
  }, []);

  useEffect(() => {
    async function autoSyncGarden() {
      const savedSubscription = localStorage.getItem(PUSH_STORAGE_KEY);

      if (!savedSubscription) return;

      await syncGarden(JSON.parse(savedSubscription), plants);
    }

    autoSyncGarden();
  }, [plants, weather]);

  const selectedPlant =
    plants.find((plant) => plant.id === selectedId) || plants[0];

  const filteredLibrary = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return plantLibrary;

    return plantLibrary.filter((plant) =>
      `${plant.name} ${plant.category}`.toLowerCase().includes(q)
    );
  }, [search]);

  const pendingToday = plants.filter((plant) => {
    const status = getStatus(plant, weather);
    return ["Hoy toca", "Urgente", "Atrasado"].includes(status.label);
  }).length;

  const nextPlant = useMemo(() => {
    if (!plants.length) return null;

    return [...plants].sort(
      (a, b) =>
        getNextWateringDate(a, weather) - getNextWateringDate(b, weather)
    )[0];
  }, [plants, weather]);

  const weatherFactor = getWeatherFactor(weather);

  async function syncGarden(subscription, gardenPlants = plants) {
    if (!subscription?.endpoint) return;

    try {
      await fetch("/.netlify/functions/save-garden", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          plants: buildBackendPlants(gardenPlants, weather),
        }),
      });
    } catch (error) {
      console.log("Error sincronizando jardín:", error);
    }
  }

  function selectTemplate(template) {
    setDraft({ ...template, stage: template.stage || "mature" });
    setSearch(template.name);
  }

  function resetData() {
    setPlants([]);
    setSelectedId(null);

    const savedSubscription = localStorage.getItem(PUSH_STORAGE_KEY);
    if (savedSubscription) {
      syncGarden(JSON.parse(savedSubscription), []);
    }
  }

  function deletePlant(id) {
    setPlants((current) => {
      const nextPlants = current.filter((plant) => plant.id !== id);

      const savedSubscription = localStorage.getItem(PUSH_STORAGE_KEY);
      if (savedSubscription) {
        syncGarden(JSON.parse(savedSubscription), nextPlants);
      }

      return nextPlants;
    });

    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  function updatePlantStage(id, stage) {
    setPlants((current) => {
      const nextPlants = current.map((plant) =>
        plant.id === id
          ? {
              ...plant,
              stage,
            }
          : plant
      );

      const savedSubscription = localStorage.getItem(PUSH_STORAGE_KEY);
      if (savedSubscription) {
        syncGarden(JSON.parse(savedSubscription), nextPlants);
      }

      return nextPlants;
    });
  }

  async function requestNotifications() {
    setNotificationMessage("");

    try {
      if (!("Notification" in window)) {
        setNotificationPermission("unsupported");
        setNotificationMessage("Este navegador no soporta notificaciones.");
        return;
      }

      if (!("serviceWorker" in navigator)) {
        setNotificationMessage("No se ha detectado Service Worker.");
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== "granted") {
        setNotificationMessage("Permiso no concedido.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const existingSubscription =
        await registration.pushManager.getSubscription();

      if (existingSubscription) {
        localStorage.setItem(
          PUSH_STORAGE_KEY,
          JSON.stringify(existingSubscription)
        );
        await syncGarden(existingSubscription, plants);
        setNotificationMessage("Notificaciones ya estaban activadas.");
        return;
      }

      const keyResponse = await fetch("/.netlify/functions/public-key");

      if (!keyResponse.ok) {
        throw new Error("No se pudo obtener la clave pública.");
      }

      const { publicKey } = await keyResponse.json();

      if (!publicKey) {
        throw new Error("Falta VAPID_PUBLIC_KEY.");
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      localStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify(subscription));

      await syncGarden(subscription, plants);

      setNotificationMessage("Notificaciones activadas correctamente.");
    } catch (error) {
      console.log("Error activando push:", error);
      setNotificationMessage("No se pudieron activar las notificaciones.");
    }
  }

  async function sendTestWateringNotification() {
    try {
      const savedSubscription = localStorage.getItem(PUSH_STORAGE_KEY);

      if (!savedSubscription) {
        setNotificationMessage("Primero activa las notificaciones.");
        return;
      }

      await syncGarden(JSON.parse(savedSubscription), plants);

      const plant = nextPlant || selectedPlant;
      const water = plant ? getAdjustedWater(plant, weather) : null;

      const response = await fetch("/.netlify/functions/send-test-push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: JSON.parse(savedSubscription),
          title: "🌿 Aviso de riego",
          body: plant
            ? `${plant.name}: riego recomendado · ${water} ml.`
            : "Notificación real funcionando.",
        }),
      });

      if (!response.ok) {
        throw new Error("Error enviando push.");
      }

      setNotificationMessage("Push real enviado.");
    } catch (error) {
      console.log("Error enviando push:", error);
      setNotificationMessage("No se pudo enviar el push real.");
    }
  }

  async function addPlant(event) {
    event.preventDefault();
    if (!draft.name.trim()) return;

    let imageData = {};

    try {
      const result = await fetchPlantImage(draft.name);
      if (result?.image) {
        imageData = result;
      }
    } catch (error) {
      console.log("Error cargando imagen:", error);
    }

    const newPlant = {
      ...draft,
      ...imageData,
      id: crypto.randomUUID(),
      stage: draft.stage || "mature",
      lastWatered: new Date().toISOString(),
      history: [],
    };

    const nextPlants = [newPlant, ...plants];

    setPlants(nextPlants);
    setSelectedId(newPlant.id);
    setShowForm(false);
    setSearch("");

    const savedSubscription = localStorage.getItem(PUSH_STORAGE_KEY);
    if (savedSubscription) {
      await syncGarden(JSON.parse(savedSubscription), nextPlants);
    }

    setDraft({
      name: "",
      category: "",
      location: "Terraza",
      frequency: 2,
      water: 250,
      stage: "mature",
      notes: "",
      emoji: "🌱",
    });
  }

  function markWatered(id) {
    const now = new Date();

    setPlants((current) => {
      const nextPlants = current.map((plant) =>
        plant.id === id
          ? {
              ...plant,
              lastWatered: now.toISOString(),
              history: [
                {
                  date: now.toISOString(),
                  water: getAdjustedWater(plant, weather),
                  stage: plant.stage || "mature",
                },
                ...plant.history,
              ].slice(0, 10),
            }
          : plant
      );

      const savedSubscription = localStorage.getItem(PUSH_STORAGE_KEY);
      if (savedSubscription) {
        syncGarden(JSON.parse(savedSubscription), nextPlants);
      }

      return nextPlants;
    });
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">PWA · iPhone · Sevilla</p>
          <h1>El jardín de Capacete</h1>
          <p className="subtitle">
            Sistema inteligente para controlar riego y salud de tus plantas.
          </p>
        </div>

        <div className="heroRight">
          <div className="heroIcon appStoreIcon">
            <img src="/icon-192.png" alt="El jardín de Capacete" />
          </div>

          <div className="notificationBellBox">
            <button
              className={`notificationBell ${
                notificationPermission === "granted"
                  ? "active"
                  : notificationPermission === "denied"
                  ? "blocked"
                  : ""
              }`}
              onClick={() => setShowNotificationMenu((value) => !value)}
              aria-label="Notificaciones"
            >
              🔔
            </button>

            {showNotificationMenu && (
              <div className="notificationPopover">
                <span>Notificaciones</span>
                <strong>
                  {notificationPermission === "granted"
                    ? "Activas"
                    : notificationPermission === "denied"
                    ? "Bloqueadas"
                    : notificationPermission === "unsupported"
                    ? "No disponibles"
                    : "Pendientes"}
                </strong>

                <p>
                  {isStandalone
                    ? "Avisos reales sincronizados con tu jardín."
                    : "En iPhone abre la app desde el icono de inicio."}
                </p>

                {notificationMessage && <small>{notificationMessage}</small>}

                <button
                  className="popoverBtn"
                  onClick={async () => {
                    await requestNotifications();
                    setShowNotificationMenu(false);
                  }}
                >
                  Activar notificaciones
                </button>

                <button
                  className="popoverBtn secondary"
                  onClick={sendTestWateringNotification}
                >
                  Probar aviso
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="dashboardWidgets">
        <article className={`widget widgetWeather ${weatherFactor.urgency}`}>
          <span>Clima Sevilla</span>
          <strong>{weatherFactor.label}</strong>
          <p>{weatherError || weatherFactor.reason}</p>

          <div className="miniWeatherGrid">
            <div>
              <b>{weather ? `${weather.maxTemp}º` : "—"}</b>
              <small>Máx</small>
            </div>
            <div>
              <b>{weather ? `${weather.rain} mm` : "—"}</b>
              <small>Lluvia</small>
            </div>
            <div>
              <b>{weather ? `${weather.wind} km/h` : "—"}</b>
              <small>Viento</small>
            </div>
          </div>
        </article>

        <article className="widget widgetDark">
          <span>Pendientes</span>
          <strong>{pendingToday}</strong>
          <p>{pendingToday === 0 ? "Todo bajo control" : "Revisar hoy"}</p>
        </article>

        <article className="widget widgetGreen">
          <span>Plantas</span>
          <strong>{plants.length}</strong>
          <p>Terraza activa</p>
        </article>

        <article className="widget widgetNext">
          <span>Próximo riego</span>
          <strong>{nextPlant ? nextPlant.name : "—"}</strong>
          <p>
            {nextPlant
              ? formatDate(getNextWateringDate(nextPlant, weather))
              : "Sin plantas"}
          </p>
        </article>
      </section>

      <section className="sectionHeader">
        <h2>Mi Jardín</h2>
        <div className="actionsRow">
          <button className="secondaryBtn" onClick={resetData}>
            Reset
          </button>
          <button className="secondaryBtn" onClick={() => setShowForm(true)}>
            + Añadir
          </button>
        </div>
      </section>

      {plants.length === 0 && !showForm && (
        <section className="emptyGarden">
          <span>🌱</span>
          <h2>Aún no tienes plantas</h2>
          <p>Añade tu primera planta y la app calculará riego, fase y clima.</p>
          <button className="primaryBtn" onClick={() => setShowForm(true)}>
            Añadir primera planta
          </button>
        </section>
      )}

      {showForm && (
        <section className="formPanel">
          <div className="formTop">
            <div>
              <h2>Añadir planta</h2>
              <p>Selecciona una planta y define su fase actual.</p>
            </div>

            <button className="closeBtn" onClick={() => setShowForm(false)}>
              ×
            </button>
          </div>

          <form onSubmit={addPlant}>
            <label>Buscar planta</label>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setDraft({ ...draft, name: event.target.value });
              }}
              placeholder="Ej: albahaca, tomillo..."
            />

            <div className="suggestions">
              {filteredLibrary.map((plant) => (
                <button
                  type="button"
                  key={plant.name}
                  className="suggestion"
                  onClick={() => selectTemplate(plant)}
                >
                  <span>{plant.emoji}</span>
                  <div>
                    <strong>{plant.name}</strong>
                    <small>
                      {plant.category} · {plant.water} ml base
                    </small>
                  </div>
                </button>
              ))}
            </div>

            <label>Fase de la planta</label>
            <div className="stageSelector">
              {Object.entries(STAGES).map(([key, stage]) => (
                <button
                  key={key}
                  type="button"
                  className={`stageOption ${
                    draft.stage === key ? "active" : ""
                  }`}
                  onClick={() => setDraft({ ...draft, stage: key })}
                >
                  <span>{stage.emoji}</span>
                  <strong>{stage.label}</strong>
                </button>
              ))}
            </div>

            <label>Nombre</label>
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />

            <label>Ubicación</label>
            <input
              value={draft.location}
              onChange={(event) =>
                setDraft({ ...draft, location: event.target.value })
              }
            />

            <div className="formGrid">
              <div>
                <label>Frecuencia base</label>
                <input
                  type="number"
                  min="1"
                  value={draft.frequency}
                  onChange={(event) =>
                    setDraft({ ...draft, frequency: Number(event.target.value) })
                  }
                />
              </div>

              <div>
                <label>Agua base ml</label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={draft.water}
                  onChange={(event) =>
                    setDraft({ ...draft, water: Number(event.target.value) })
                  }
                />
              </div>
            </div>

            <label>Notas</label>
            <textarea
              value={draft.notes}
              onChange={(event) =>
                setDraft({ ...draft, notes: event.target.value })
              }
              rows="4"
            />

            <button className="primaryBtn" type="submit">
              Guardar planta
            </button>
          </form>
        </section>
      )}

      <section className="plantList">
        {plants.map((plant) => {
          const normalizedPlant = normalizePlant(plant);
          const status = getStatus(normalizedPlant, weather);
          const adjustedWater = getAdjustedWater(normalizedPlant, weather);
          const adjustedFrequency = getAdjustedFrequency(
            normalizedPlant,
            weather
          );
          const nextDate = getNextWateringDate(normalizedPlant, weather);
          const stageInfo = getStageInfo(normalizedPlant.stage);

          return (
            <button
              key={normalizedPlant.id}
              className={`plantCard ${
                selectedPlant?.id === normalizedPlant.id ? "active" : ""
              }`}
              onClick={() => setSelectedId(normalizedPlant.id)}
            >
              <div className="plantImage">
                {normalizedPlant.image ? (
                  <img src={normalizedPlant.image} alt={normalizedPlant.name} />
                ) : (
                  <span>{normalizedPlant.emoji}</span>
                )}
              </div>

              <div className="plantInfo">
                <div>
                  <div className="plantTop">
                    <div>
                      <h3>{normalizedPlant.name}</h3>
                      <p>{normalizedPlant.location}</p>
                    </div>
                    <span className={status.className}>{status.label}</span>
                  </div>

                  <div className="stageBadge">
                    <span>{stageInfo.emoji}</span>
                    {stageInfo.label}
                  </div>
                </div>

                <div className="plantMeta">
                  <span>
                    Último{" "}
                    <strong>{formatDate(normalizedPlant.lastWatered)}</strong>
                  </span>
                  <span>
                    Próximo <strong>{formatDate(nextDate)}</strong>
                  </span>
                  <span>
                    Frecuencia <strong>{adjustedFrequency} día(s)</strong>
                  </span>
                  <span>
                    Agua <strong>{adjustedWater} ml</strong>
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {selectedPlant && plants.length > 0 && (
        <section className="detailCard">
          <div className="detailHero">
            {selectedPlant.image ? (
              <img src={selectedPlant.image} alt={selectedPlant.name} />
            ) : (
              <span>{selectedPlant.emoji}</span>
            )}
          </div>

          <div className="detailContent">
            <p className="eyebrow">Ficha de planta</p>
            <h2>{selectedPlant.name}</h2>
            <p className="detailLocation">{selectedPlant.location}</p>

            {selectedPlant.photographer && (
              <p className="photoCredit">
                Foto de{" "}
                <a
                  href={selectedPlant.photographerUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedPlant.photographer}
                </a>{" "}
                en{" "}
                <a
                  href={selectedPlant.pexelsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pexels
                </a>
              </p>
            )}

            <div className="stageDetailBox">
              <div>
                <span>{getStageInfo(selectedPlant.stage).emoji}</span>
                <strong>{getStageInfo(selectedPlant.stage).label}</strong>
              </div>
              <p>{getStageInfo(selectedPlant.stage).note}</p>
            </div>

            <div className="stageSelector inline">
              {Object.entries(STAGES).map(([key, stage]) => (
                <button
                  key={key}
                  type="button"
                  className={`stageOption ${
                    selectedPlant.stage === key ? "active" : ""
                  }`}
                  onClick={() => updatePlantStage(selectedPlant.id, key)}
                >
                  <span>{stage.emoji}</span>
                  <strong>{stage.label}</strong>
                </button>
              ))}
            </div>

            <div className="detailGrid">
              <div>
                <small>Último riego</small>
                <strong>{formatDate(selectedPlant.lastWatered)}</strong>
              </div>

              <div>
                <small>Próximo riego</small>
                <strong>
                  {formatDate(getNextWateringDate(selectedPlant, weather))}
                </strong>
              </div>

              <div>
                <small>Frecuencia fase</small>
                <strong>
                  Cada {getAdjustedFrequency(selectedPlant, weather)} días
                </strong>
              </div>

              <div>
                <small>Agua fase</small>
                <strong>{getAdjustedWater(selectedPlant, weather)} ml</strong>
              </div>
            </div>

            <div className="noteBox">
              <p>{selectedPlant.notes}</p>
              <strong>{weatherFactor.label}</strong>
              <p>{weatherFactor.reason}</p>
            </div>

            <div className="detailActions">
              <button
                className="primaryBtn"
                onClick={() => markWatered(selectedPlant.id)}
              >
                💧 Marcar como regada
              </button>

              <button
                className="dangerBtn"
                onClick={() => deletePlant(selectedPlant.id)}
              >
                Eliminar planta
              </button>
            </div>

            <div className="history">
              <h3>Historial reciente</h3>

              {selectedPlant.history.length === 0 ? (
                <p className="empty">Todavía no hay riegos registrados.</p>
              ) : (
                selectedPlant.history.map((item) => (
                  <div className="historyItem" key={item.date}>
                    <span>
                      {formatDate(new Date(item.date))} ·{" "}
                      {getStageInfo(item.stage).label}
                    </span>
                    <strong>{item.water} ml</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}