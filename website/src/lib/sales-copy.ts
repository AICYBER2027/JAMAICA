import type { Lang } from "./i18n.ts";

// Everything written on the sales page, in each language.

const en = {
  metaTitle: "Websites for small hotels, with free rooms and WhatsApp bookings",
  metaDescription:
    "We make a website for your hotel or guesthouse: your rooms, which ones are free on which days, and a WhatsApp button so guests can book with you directly.",
  menu: "Menu",
  title: "Your hotel online",
  lede: "A website for hotels and guesthouses that don't have one: your rooms, which ones are free on which days, and a WhatsApp button for bookings.",
  start: "Get your hotel online",
  seeSite: "See {hotel}'s site",
  caption: "{hotel}, {town}. {rooms} rooms, taking bookings on WhatsApp and {site}.",
  showcaseA: "Guests see what's free",
  showcaseB: "and ask you on WhatsApp",
  showcaseStage1: "Every room with its picture, beds and price, and whether it's free for the dates the guest picked.",
  showcaseStage2: "The whole calendar, room by room. It fills itself from Booking.com or Airbnb, and you can mark days by hand.",
  showcaseStage3: "Tap a free day and the WhatsApp message is already written: room, dates, guests. You only answer.",
  tryIt: "Try it: tap a free day",
  boardRoom: "Room {n}",
  waPreview: "The message you receive",
  howTitle: "How it works",
  steps: [
    { verb: "Send", text: "Send us photos of your rooms, your prices and your WhatsApp number. A phone camera is fine." },
    { verb: "Connect", text: "We connect each room's calendar from Booking.com, Airbnb or Expedia, so taken days show up on their own." },
    { verb: "Answer", text: "Guests find you, see what's free and write to you on WhatsApp, or book on the site you already use." },
  ],
  listTitle: "What every site has",
  listHead: ["What", "What it does", "Who it's for"],
  list: [
    ["Your own address", "yourhotel.com, or a free address to start", "Guests"],
    ["Rooms and prices", "Photos, beds, how many people fit, price per night", "Guests"],
    ["Free-room calendar", "Which room is free on which day, months ahead", "Guests"],
    ["Booking.com sync", "Days booked there show as taken, every 15 minutes", "You"],
    ["Airbnb and Expedia sync", "The same, for any site that gives a calendar link", "You"],
    ["Days you mark yourself", "For phone bookings and walk-ins, from your phone", "You"],
    ["WhatsApp button", "The guest's message arrives with room, dates and guests written", "Both"],
    ["Link to your booking page", "Opens Booking.com or Airbnb with the dates filled in", "Guests"],
    ["Three languages", "English, Portuguese and Spanish, chosen by the guest's phone", "Guests"],
    ["Made for phones", "Most guests look at it on a phone; it's built for that first", "Guests"],
  ],
  faqTitle: "Your questions",
  faq: [
    {
      q: "Do I need to be on Booking.com?",
      a: "No. If you're not on any booking site, you mark the taken days yourself from your phone, and guests reach you on WhatsApp.",
    },
    {
      q: "Will I get double bookings?",
      a: "The calendar updates from your booking sites every 15 minutes. Guests who write on WhatsApp still wait for your answer, so you always confirm.",
    },
    {
      q: "Can I change prices and photos later?",
      a: "Yes. Send the new ones on WhatsApp and we change them, usually the same day.",
    },
    {
      q: "Do you take a commission on bookings?",
      a: "No. Guests who write on WhatsApp book with you directly, and you keep the whole price.",
    },
    {
      q: "How much does it cost?",
      a: "It depends on how many rooms you have and whether you want your own address. Tell us about your hotel on WhatsApp and we'll send you a price.",
    },
    {
      q: "What do I need to send?",
      a: "Your hotel's name and address, a photo of each room, the prices, your WhatsApp number and, if you have them, your Booking.com or Airbnb calendar links.",
    },
  ],
  ctaTitle: "Open for guests tonight",
  ctaText: "Tell us about your hotel. We'll answer on WhatsApp with what we need and a price.",
  form: {
    hotel: "Hotel name",
    town: "Town",
    rooms: "Number of rooms",
    sites: "Where do you take bookings now?",
    sitesHint: "For example Booking.com, Airbnb, phone",
    send: "Send on WhatsApp",
    message: "Hello! I'd like a website for my hotel.\nHotel: {hotel}\nTown: {town}\nRooms: {rooms}\nBookings now: {sites}",
  },
  footerContact: "Contact",
  footerDemos: "Sample hotels",
  footerLegal: "{brand}. Websites for small hotels and guesthouses.",
  demoNote: "Sample hotel",
};

type Copy = typeof en;

const pt: Copy = {
  metaTitle: "Sites para pequenos hotéis, com quartos livres e reservas pelo WhatsApp",
  metaDescription:
    "Fazemos o site do seu hotel ou pousada: seus quartos, quais estão livres em que dias e um botão de WhatsApp para os hóspedes reservarem diretamente com você.",
  menu: "Menu",
  title: "Seu hotel online",
  lede: "Um site para hotéis e pousadas que ainda não têm: seus quartos, quais estão livres em que dias e um botão de WhatsApp para reservas.",
  start: "Colocar meu hotel online",
  seeSite: "Ver o site da {hotel}",
  caption: "{hotel}, {town}. {rooms} quartos, com reservas pelo WhatsApp e pelo {site}.",
  showcaseA: "O hóspede vê o que está livre",
  showcaseB: "e pergunta no WhatsApp",
  showcaseStage1: "Cada quarto com foto, camas e preço, e se está livre nas datas que o hóspede escolheu.",
  showcaseStage2: "O calendário inteiro, quarto a quarto. Ele se preenche sozinho a partir do Booking.com ou do Airbnb, e você pode marcar dias à mão.",
  showcaseStage3: "Toque em um dia livre e a mensagem de WhatsApp já vem escrita: quarto, datas, hóspedes. Você só precisa responder.",
  tryIt: "Experimente: toque num dia livre",
  boardRoom: "Quarto {n}",
  waPreview: "A mensagem que você recebe",
  howTitle: "Como funciona",
  steps: [
    { verb: "Envie", text: "Mande fotos dos quartos, os preços e o seu número de WhatsApp. A câmera do celular serve." },
    { verb: "Conecte", text: "Conectamos o calendário de cada quarto do Booking.com, Airbnb ou Expedia, para que os dias ocupados apareçam sozinhos." },
    { verb: "Responda", text: "Os hóspedes encontram você, veem o que está livre e escrevem no seu WhatsApp, ou reservam no site que você já usa." },
  ],
  listTitle: "O que todos os sites têm",
  listHead: ["O quê", "O que faz", "Para quem"],
  list: [
    ["Seu próprio endereço", "seuhotel.com, ou um endereço grátis para começar", "Hóspedes"],
    ["Quartos e preços", "Fotos, camas, quantas pessoas cabem, preço por noite", "Hóspedes"],
    ["Calendário de quartos livres", "Que quarto está livre em que dia, com meses de antecedência", "Hóspedes"],
    ["Ligação ao Booking.com", "Os dias reservados lá aparecem ocupados, a cada 15 minutos", "Você"],
    ["Ligação ao Airbnb e Expedia", "O mesmo, para qualquer site que dê um link de calendário", "Você"],
    ["Dias marcados por você", "Para reservas por telefone e ao balcão, pelo celular", "Você"],
    ["Botão de WhatsApp", "A mensagem chega com quarto, datas e hóspedes já escritos", "Ambos"],
    ["Link para sua página de reservas", "Abre o Booking.com ou o Airbnb com as datas preenchidas", "Hóspedes"],
    ["Três idiomas", "Português, inglês e espanhol, conforme o celular do hóspede", "Hóspedes"],
    ["Feito para celular", "A maioria vê no celular; ele é feito primeiro para isso", "Hóspedes"],
  ],
  faqTitle: "Suas perguntas",
  faq: [
    {
      q: "Preciso estar no Booking.com?",
      a: "Não. Se você não está em nenhum site de reservas, marca os dias ocupados no celular e os hóspedes falam com você pelo WhatsApp.",
    },
    {
      q: "Vou ter reservas duplicadas?",
      a: "O calendário se atualiza a partir dos seus sites de reserva a cada 15 minutos. Quem escreve no WhatsApp espera pela sua resposta, por isso é sempre você que confirma.",
    },
    {
      q: "Posso mudar preços e fotos depois?",
      a: "Sim. Mande os novos pelo WhatsApp e nós trocamos, normalmente no mesmo dia.",
    },
    {
      q: "Cobram comissão sobre as reservas?",
      a: "Não. Quem escreve no WhatsApp reserva diretamente com você, e você fica com o valor inteiro.",
    },
    {
      q: "Quanto custa?",
      a: "Depende de quantos quartos você tem e se quer um endereço próprio. Conte sobre o seu hotel no WhatsApp e enviamos um preço.",
    },
    {
      q: "O que preciso enviar?",
      a: "O nome e o endereço do hotel, uma foto de cada quarto, os preços, o seu WhatsApp e, se tiver, os links de calendário do Booking.com ou Airbnb.",
    },
  ],
  ctaTitle: "Aberto a hóspedes esta noite",
  ctaText: "Conte sobre o seu hotel. Respondemos no WhatsApp com o que precisamos e um preço.",
  form: {
    hotel: "Nome do hotel",
    town: "Cidade",
    rooms: "Número de quartos",
    sites: "Onde recebe reservas hoje?",
    sitesHint: "Por exemplo Booking.com, Airbnb, telefone",
    send: "Enviar pelo WhatsApp",
    message: "Olá! Gostaria de um site para o meu hotel.\nHotel: {hotel}\nCidade: {town}\nQuartos: {rooms}\nReservas hoje: {sites}",
  },
  footerContact: "Contato",
  footerDemos: "Hotéis de exemplo",
  footerLegal: "{brand}. Sites para pequenos hotéis e pousadas.",
  demoNote: "Hotel de exemplo",
};

const es: Copy = {
  metaTitle: "Webs para hoteles pequeños, con habitaciones libres y reservas por WhatsApp",
  metaDescription:
    "Hacemos la web de tu hotel u hostal: tus habitaciones, cuáles están libres qué días y un botón de WhatsApp para que los huéspedes reserven directamente contigo.",
  menu: "Menú",
  title: "Tu hotel online",
  lede: "Una web para hoteles y hostales que aún no tienen: tus habitaciones, cuáles están libres qué días y un botón de WhatsApp para reservar.",
  start: "Poner mi hotel online",
  seeSite: "Ver la web de {hotel}",
  caption: "{hotel}, {town}. {rooms} habitaciones, con reservas por WhatsApp y {site}.",
  showcaseA: "El huésped ve qué está libre",
  showcaseB: "y te pregunta por WhatsApp",
  showcaseStage1: "Cada habitación con su foto, camas y precio, y si está libre en las fechas que eligió el huésped.",
  showcaseStage2: "El calendario entero, habitación por habitación. Se llena solo desde Booking.com o Airbnb, y puedes marcar días a mano.",
  showcaseStage3: "Toca un día libre y el mensaje de WhatsApp ya está escrito: habitación, fechas, huéspedes. Solo tienes que contestar.",
  tryIt: "Pruébalo: toca un día libre",
  boardRoom: "Habitación {n}",
  waPreview: "El mensaje que recibes",
  howTitle: "Cómo funciona",
  steps: [
    { verb: "Envía", text: "Mándanos fotos de las habitaciones, los precios y tu número de WhatsApp. La cámara del móvil sirve." },
    { verb: "Conecta", text: "Conectamos el calendario de cada habitación de Booking.com, Airbnb o Expedia, para que los días ocupados aparezcan solos." },
    { verb: "Responde", text: "Los huéspedes te encuentran, ven qué está libre y te escriben por WhatsApp, o reservan en la web que ya usas." },
  ],
  listTitle: "Lo que tiene cada web",
  listHead: ["Qué", "Qué hace", "Para quién"],
  list: [
    ["Tu propia dirección", "tuhotel.com, o una dirección gratis para empezar", "Huéspedes"],
    ["Habitaciones y precios", "Fotos, camas, cuántas personas caben, precio por noche", "Huéspedes"],
    ["Calendario de habitaciones libres", "Qué habitación está libre qué día, con meses de antelación", "Huéspedes"],
    ["Conexión con Booking.com", "Los días reservados allí salen ocupados, cada 15 minutos", "Tú"],
    ["Conexión con Airbnb y Expedia", "Lo mismo, para cualquier web que dé un enlace de calendario", "Tú"],
    ["Días que marcas tú", "Para reservas por teléfono y en recepción, desde el móvil", "Tú"],
    ["Botón de WhatsApp", "El mensaje llega con habitación, fechas y huéspedes ya escritos", "Ambos"],
    ["Enlace a tu página de reservas", "Abre Booking.com o Airbnb con las fechas puestas", "Huéspedes"],
    ["Tres idiomas", "Español, inglés y portugués, según el móvil del huésped", "Huéspedes"],
    ["Hecha para el móvil", "Casi todos la miran en el móvil; está pensada primero para eso", "Huéspedes"],
  ],
  faqTitle: "Tus preguntas",
  faq: [
    {
      q: "¿Necesito estar en Booking.com?",
      a: "No. Si no estás en ninguna web de reservas, marcas los días ocupados desde el móvil y los huéspedes te escriben por WhatsApp.",
    },
    {
      q: "¿Tendré reservas duplicadas?",
      a: "El calendario se actualiza desde tus webs de reservas cada 15 minutos. Quien escribe por WhatsApp espera tu respuesta, así que siempre confirmas tú.",
    },
    {
      q: "¿Puedo cambiar precios y fotos después?",
      a: "Sí. Mándanos los nuevos por WhatsApp y los cambiamos, normalmente el mismo día.",
    },
    {
      q: "¿Cobráis comisión por las reservas?",
      a: "No. Quien escribe por WhatsApp reserva directamente contigo y te quedas el precio entero.",
    },
    {
      q: "¿Cuánto cuesta?",
      a: "Depende de cuántas habitaciones tengas y de si quieres dirección propia. Cuéntanos de tu hotel por WhatsApp y te mandamos un precio.",
    },
    {
      q: "¿Qué tengo que enviar?",
      a: "El nombre y la dirección del hotel, una foto de cada habitación, los precios, tu WhatsApp y, si los tienes, los enlaces de calendario de Booking.com o Airbnb.",
    },
  ],
  ctaTitle: "Abierto a huéspedes esta noche",
  ctaText: "Cuéntanos de tu hotel. Te contestamos por WhatsApp con lo que necesitamos y un precio.",
  form: {
    hotel: "Nombre del hotel",
    town: "Ciudad",
    rooms: "Número de habitaciones",
    sites: "¿Dónde recibes reservas ahora?",
    sitesHint: "Por ejemplo Booking.com, Airbnb, teléfono",
    send: "Enviar por WhatsApp",
    message: "¡Hola! Me gustaría una web para mi hotel.\nHotel: {hotel}\nCiudad: {town}\nHabitaciones: {rooms}\nReservas ahora: {sites}",
  },
  footerContact: "Contacto",
  footerDemos: "Hoteles de ejemplo",
  footerLegal: "{brand}. Webs para hoteles pequeños y hostales.",
  demoNote: "Hotel de ejemplo",
};

export type SalesCopy = Copy;
export const SALES: Record<Lang, Copy> = { en, pt, es };
