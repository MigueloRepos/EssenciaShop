import casesImage from "@/assets/product-cases.jpg";
import chargingImage from "@/assets/product-charging.jpg";
import audioWatchImage from "@/assets/product-audio-watch.jpg";

export type Category =
  | "Todos"
  | "Fundas y Protectores"
  | "Cargadores y Cables"
  | "Audio"
  | "Power Banks"
  | "Relojes Inteligentes"
  | "Auto"
  | "Gaming"
  | "Gadgets Inteligentes";

export type ProductSpec = {
  label: string;
  value: string;
};

export type Product = {
  id: number;
  name: string;
  category: Exclude<Category, "Todos">;
  price: number;
  oldPrice: number;
  rating: number;
  reviews: number;
  badge?: string;
  image: string;
  description: string;
  features: string[];
  specs: ProductSpec[];
  stock: number;
  sku: string;
};

export const categories: Category[] = [
  "Todos",
  "Fundas y Protectores",
  "Cargadores y Cables",
  "Audio",
  "Power Banks",
  "Relojes Inteligentes",
  "Auto",
  "Gaming",
  "Gadgets Inteligentes",
];

export const products: Product[] = [
  {
    id: 1,
    name: "Funda MagSafe Air Shield",
    category: "Fundas y Protectores",
    price: 24.9,
    oldPrice: 34.9,
    rating: 4.9,
    reviews: 184,
    badge: "Más vendido",
    image: casesImage,
    description: "Funda con amortiguación perimetral de aire y certificación militar contra impactos. Incorpora un anillo magnético de neodimio N52 alineado con precisión para acoplar accesorios y cargadores MagSafe/Qi2 al instante sin sobrecalentar el terminal.",
    features: [
      "Imanes N52 con 1400 gf de fuerza de sujeción",
      "Certificación militar anticaídas MIL-STD-810H (hasta 3.2m)",
      "Tratamiento antiamarilleo UV 4X y capa oleofóbica antihuellas",
      "Biseles elevados de 1.5 mm para pantalla y módulo de cámara",
    ],
    specs: [
      { label: "Material", value: "Policarbonato Bayer + TPU flexible alemán" },
      { label: "Compatibilidad", value: "MagSafe, Qi2 y carga inalámbrica universal" },
      { label: "Grosor del perfil", value: "1.8 mm ultraligero" },
      { label: "Botones", value: "Aleación de aluminio con respuesta táctil directa" },
    ],
    stock: 14,
    sku: "ESS-MAG-01",
  },
  {
    id: 2,
    name: "Cargador GaN Ultra 65W",
    category: "Cargadores y Cables",
    price: 42.9,
    oldPrice: 59.9,
    rating: 4.8,
    reviews: 126,
    badge: "-28%",
    image: chargingImage,
    description: "Cargador compacto de pared con semiconductores de nitruro de galio (GaN V) de última generación. Permite alimentar un portátil a 65W o repartir la energía entre tres dispositivos a la vez con regulación térmica dinámica en tiempo real.",
    features: [
      "Carga portátiles, tablets y smartphones a máxima velocidad",
      "Protocolo PPS adaptativo que protege la salud de la batería",
      "58% más pequeño que los adaptadores convencionales de 65W",
      "9 protecciones eléctricas: sobretensión, sobrecorriente y cortocircuitos",
    ],
    specs: [
      { label: "Potencia Máxima", value: "65W (Power Delivery 3.0 / PPS / QC4+)" },
      { label: "Puertos de salida", value: "2x USB-C (65W/30W) + 1x USB-A (18W)" },
      { label: "Tecnología", value: "Semiconductores GaN V alta frecuencia" },
      { label: "Dimensiones", value: "52 × 31 × 31 mm (Peso: 108g)" },
    ],
    stock: 22,
    sku: "ESS-GAN-65",
  },
  {
    id: 3,
    name: "Auriculares Aura ANC",
    category: "Audio",
    price: 69.9,
    oldPrice: 89.9,
    rating: 4.9,
    reviews: 207,
    badge: "Nuevo",
    image: audioWatchImage,
    description: "Auriculares inalámbricos True Wireless con sistema de cancelación activa de ruido híbrida de hasta -42dB. Sus drivers de biocelulosa de 11 mm proporcionan graves profundos y agudos cristalinos sin distorsión armónica.",
    features: [
      "Cancelación de ruido activa adaptativa y modo transparencia",
      "6 micrófonos con algoritmo neuronal de reducción de ruido de viento",
      "Carga rápida: 10 minutos de estuche proporcionan 2.5 horas de música",
      "Conexión Bluetooth 5.4 multipunto (conecta móvil y PC simultáneamente)",
    ],
    specs: [
      { label: "Autonomía", value: "8h continuas + 30h en estuche (38h totales)" },
      { label: "Drivers", value: "11 mm Biocelulosa de alta resolución" },
      { label: "Códecs", value: "LDAC Hi-Res Audio, AAC y SBC" },
      { label: "Protección", value: "Certificación IPX5 resistente al agua y sudor" },
    ],
    stock: 9,
    sku: "ESS-AUR-ANC",
  },
  {
    id: 4,
    name: "Power Bank Slim 10.000 mAh",
    category: "Power Banks",
    price: 39.9,
    oldPrice: 49.9,
    rating: 4.7,
    reviews: 98,
    image: chargingImage,
    description: "Batería portátil ultracompacta con chasis de aluminio espacial anodizado. Cuenta con pantalla digital oculta que muestra el porcentaje exacto de batería y soporte para carga rápida bidireccional PD de 30W.",
    features: [
      "Carga un smartphone moderno de 2 a 2.5 veces completas",
      "Perfil ultrafino de solo 14 mm fácil de guardar en bolsillos",
      "Modo especial de baja corriente para auriculares y pulseras inteligentes",
      "Apto para equipaje de mano en vuelos comerciales (normativa IATA)",
    ],
    specs: [
      { label: "Capacidad", value: "10.000 mAh / 37Wh celdas Li-Po clase A" },
      { label: "Salidas", value: "USB-C PD 30W bidireccional + USB-A 22.5W SCP" },
      { label: "Pantalla", value: "Display LED digital integrado" },
      { label: "Peso", value: "185 gramos" },
    ],
    stock: 31,
    sku: "ESS-PB-10K",
  },
  {
    id: 5,
    name: "Smartwatch Pulse S2",
    category: "Relojes Inteligentes",
    price: 84.9,
    oldPrice: 109.9,
    rating: 4.8,
    reviews: 152,
    badge: "Favorito",
    image: audioWatchImage,
    description: "Reloj inteligente con pantalla curva AMOLED Retina de 1.96\" a 60Hz. Permite responder llamadas con voz nítida por Bluetooth, monitorizar la saturación de oxígeno en sangre (SpO2) y registrar más de 100 disciplinas deportivas.",
    features: [
      "Pantalla AMOLED Always-on Display con 1000 nits de brillo bajo el sol",
      "Altavoz y micrófono HD con supresión de eco para llamadas Bluetooth",
      "Monitor de ritmo cardíaco 24/7, SpO2, estrés y fases de sueño REM",
      "Batería de larga duración de hasta 12 días por carga",
    ],
    specs: [
      { label: "Pantalla", value: "1.96\" AMOLED (410 × 502 px, 332 ppi)" },
      { label: "Resistencia al agua", value: "5 ATM (sumergible hasta 50 metros)" },
      { label: "Conectividad", value: "Bluetooth 5.3 BLE / iOS y Android" },
      { label: "Material de caja", value: "Aleación de zinc + correa hipoalergénica de 22 mm" },
    ],
    stock: 18,
    sku: "ESS-SW-PS2",
  },
  {
    id: 6,
    name: "Cable USB-C Trenzado 2 m",
    category: "Cargadores y Cables",
    price: 14.9,
    oldPrice: 19.9,
    rating: 4.8,
    reviews: 311,
    image: chargingImage,
    description: "Cable de carga ultrarrápido y transmisión de datos trenzado en nylon balístico reforzado con fibras internas de aramida. Integra chip inteligente E-Marker para gestionar transferencias energéticas seguras de hasta 100W.",
    features: [
      "Capacidad de suministro eléctrico de hasta 100W (20V/5A)",
      "Construcción trenzada ultraduradera anti-enredos",
      "Conectores de aleación de zinc niquelado resistentes a la corrosión",
      "Incluye brida organizadora de silicona reutilizable",
    ],
    specs: [
      { label: "Longitud", value: "2.0 metros (6.6 pies)" },
      { label: "Velocidad de carga", value: "Power Delivery 3.1 hasta 100W" },
      { label: "Transferencia de datos", value: "480 Mbps (USB 2.0)" },
      { label: "Test de durabilidad", value: ">35.000 ciclos de flexión a 90°" },
    ],
    stock: 45,
    sku: "ESS-CAB-100W",
  },
  {
    id: 7,
    name: "Soporte Magnético Drive",
    category: "Auto",
    price: 29.9,
    oldPrice: 39.9,
    rating: 4.6,
    reviews: 77,
    image: chargingImage,
    description: "Soporte para automóvil con pinza de gancho metálico autoblocante para rejilla de ventilación. Incorpora 16 potentes imanes de neodimio que mantienen tu teléfono inmóvil incluso en carreteras con baches pronunciados o frenadas bruscas.",
    features: [
      "Ajuste con una sola mano mediante contacto magnético instantáneo",
      "Gancho de acero inoxidable compatible con rejillas verticales y horizontales",
      "Rótula de rotación 360° para visualización vertical u horizontal",
      "No interfiere con la recepción de cobertura GPS ni señal celular",
    ],
    specs: [
      { label: "Fuerza Magnética", value: "16 imanes N52 (aguanta hasta 1.8 kg)" },
      { label: "Tipo de anclaje", value: "Pinza de rosca con gancho retráctil de acero" },
      { label: "Compatibilidad", value: "MagSafe nativo y fundas magnéticas" },
      { label: "Material", value: "Aleación de aluminio + silicona antideslizante" },
    ],
    stock: 26,
    sku: "ESS-CAR-DRV",
  },
  {
    id: 8,
    name: "Base Glow RGB Compact",
    category: "Gaming",
    price: 34.9,
    oldPrice: 44.9,
    rating: 4.7,
    reviews: 63,
    image: audioWatchImage,
    description: "Soporte compacto para auriculares o accesorios con iluminación perimetral RGB dinámica y hub de 2 puertos USB para conectar periféricos directamente en el escritorio.",
    features: [
      "10 modos de iluminación ambiental RGB seleccionables con botón táctil",
      "2 puertos USB frontales para transferencia de datos y carga de accesorios",
      "Base lastrada de 320g con almohadillas antideslizantes de goma",
      "Acabado mate premium que evita marcas de dedos y polvo",
    ],
    specs: [
      { label: "Puertos HUB", value: "2x USB 3.0 (hasta 5 Gbps)" },
      { label: "Efectos LED", value: "Respiración, arcoíris, estático y apagado" },
      { label: "Dimensiones", value: "120 × 120 × 265 mm" },
      { label: "Alimentación", value: "Cable USB-C desmontable incluido (1.5 m)" },
    ],
    stock: 12,
    sku: "ESS-RGB-GLW",
  },
];
