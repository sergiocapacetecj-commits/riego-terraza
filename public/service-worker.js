{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 self.addEventListener("install", () => \{\
  self.skipWaiting();\
\});\
\
self.addEventListener("activate", (event) => \{\
  event.waitUntil(self.clients.claim());\
\});\
\
self.addEventListener("push", (event) => \{\
  const data = event.data?.json() || \{\
    title: "El jard\'edn de Capacete",\
    body: "Tienes una planta pendiente de riego.",\
  \};\
\
  event.waitUntil(\
    self.registration.showNotification(data.title, \{\
      body: data.body,\
      icon: "/icon-192.png",\
      badge: "/icon-192.png",\
    \})\
  );\
\});}