/* Studio content. Text fields that change per language are {en, ru, kk}.
   To use real media: drop files into assets/video and assets/img and set
   `video` / `poster` / `stills` / `photo` paths below. */
window.DATA = {
  clients: ["Northlight Pictures", "Aurelia", "Rough Echo Records", "Vela Motors", "Harbour & Finch", "Ember Roasters", "Meridian Air", "Kestrel Sport", "Oakline Bank", "Saltwater Films"],

  projects: [
    {
      slug: "low-tide", title: "Low Tide", cat: "film", year: 2025, client: "Northlight Pictures", poster: 1, featured: true,
      video: "assets/video/low-tide.mp4",
      role: { en: "Full production", ru: "Полный продакшн", kk: "Толық продакшн" },
      text: {
        en: "A fisherman's daughter returns to the Essex coast the week her father's boat is sold. Shot over 19 days on Alexa 35 with Atlas Orion anamorphics, mostly at first light.",
        ru: "Дочь рыбака возвращается на побережье Эссекса в неделю, когда продают лодку её отца. Снято за 19 дней на Alexa 35 с анаморфотами Atlas Orion — в основном на рассвете.",
        kk: "Балықшының қызы әкесінің қайығы сатылатын аптада Эссекс жағалауына оралады. Alexa 35 және Atlas Orion анаморфтарымен 19 күнде, негізінен таң атарда түсірілді."
      },
      credits: { director: "Sarah Whitmore", dop: "Elena Marchetti", producer: "James Calloway", editor: "Daniel Okafor" }
    },
    {
      slug: "halcyon", title: "Halcyon", cat: "commercial", year: 2025, client: "Aurelia", poster: 2, featured: true,
      video: "assets/video/halcyon.mp4",
      role: { en: "Production & post", ru: "Продакшн и пост", kk: "Продакшн және пост" },
      text: {
        en: "A 60-second film for a watchmaker's spring collection. One unbroken move through a Mayfair workshop, built on Stage One.",
        ru: "60-секундный ролик для весенней коллекции часового бренда. Один непрерывный проход по мастерской в Мэйфэре, построенной в нашем павильоне.",
        kk: "Сағат брендінің көктемгі коллекциясына арналған 60 секундтық ролик. Біздің павильонда салынған Мэйфэрдегі шеберхана арқылы бір үзіліссіз қозғалыс."
      },
      credits: { director: "Sarah Whitmore", dop: "Elena Marchetti", producer: "Priya Nair", editor: "Daniel Okafor" }
    },
    {
      slug: "paper-moons", title: "Paper Moons", cat: "music", year: 2025, client: "Rough Echo Records", poster: 4, featured: true,
      video: "assets/video/paper-moons.mp4",
      role: { en: "Concept, production, VFX", ru: "Концепция, продакшн, VFX", kk: "Концепция, продакшн, VFX" },
      text: {
        en: "Music video for Mara Vey. Two hundred paper lanterns, one night on Hampstead Heath and a lot of patience from the park rangers.",
        ru: "Клип для Mara Vey. Двести бумажных фонарей, одна ночь в Хэмпстед-Хит и много терпения со стороны смотрителей парка.",
        kk: "Mara Vey үшін клип. Екі жүз қағаз шам, Хэмпстед-Хиттегі бір түн және саябақ күзетшілерінің үлкен шыдамы."
      },
      credits: { director: "Chloe Bennett", dop: "Elena Marchetti", producer: "Priya Nair", editor: "Marcus Lindgren" }
    },
    {
      slug: "iron-and-salt", title: "Iron & Salt", cat: "doc", year: 2024, client: "Saltwater Films", poster: 3, featured: true,
      video: "assets/video/iron-and-salt.mp4",
      role: { en: "Co-production", ru: "Копродукция", kk: "Бірлескен өндіріс" },
      text: {
        en: "A year inside the last working shipyard on the Clyde. Observational, handheld, no narration.",
        ru: "Год внутри последней действующей верфи на реке Клайд. Наблюдательное кино, ручная камера, без закадрового текста.",
        kk: "Клайд өзеніндегі соңғы жұмыс істеп тұрған кеме жасау зауытының ішіндегі бір жыл. Бақылау киносы, қол камерасы, дикторсыз."
      },
      credits: { director: "Sarah Whitmore", dop: "Elena Marchetti", producer: "James Calloway", editor: "Daniel Okafor" }
    },
    {
      slug: "northbound", title: "Northbound", cat: "commercial", year: 2024, client: "Vela Motors", poster: 6, featured: true,
      video: "assets/video/northbound.mp4",
      role: { en: "Production", ru: "Продакшн", kk: "Продакшн" },
      text: {
        en: "Launch film for an electric estate car. Highlands, five days, a drone crew and one very cold car.",
        ru: "Запускной ролик электрического универсала. Хайленд, пять дней, команда с дроном и один очень холодный автомобиль.",
        kk: "Электр универсалының іске қосу ролигі. Хайленд, бес күн, дрон тобы және бір өте суық көлік."
      },
      credits: { director: "James Calloway", dop: "Elena Marchetti", producer: "Priya Nair", editor: "Daniel Okafor" }
    },
    {
      slug: "static-bloom", title: "Static Bloom", cat: "music", year: 2024, client: "Harbour & Finch", poster: 5, featured: true,
      video: "assets/video/static-bloom.mp4",
      role: { en: "Production & grade", ru: "Продакшн и цветокоррекция", kk: "Продакшн және түс түзету" },
      text: {
        en: "A single-take performance video shot on the cyclorama, lit entirely by practicals the band carried in.",
        ru: "Перформанс-клип одним дублем на циклораме, освещённый только приборами, которые группа принесла с собой.",
        kk: "Циклорамада бір дубльмен түсірілген перформанс-клип, тек топтың өзі әкелген жарық көздерімен жарықтандырылған."
      },
      credits: { director: "Chloe Bennett", dop: "Elena Marchetti", producer: "Priya Nair", editor: "Daniel Okafor" }
    },
    {
      slug: "glasshouse", title: "Glasshouse", cat: "film", year: 2023, client: "Northlight Pictures", poster: 5,
      video: "assets/video/glasshouse.mp4",
      role: { en: "Production", ru: "Продакшн", kk: "Продакшн" },
      text: {
        en: "A short about two sisters and the greenhouse their mother left them. Selected for six festivals.",
        ru: "Короткий метр о двух сёстрах и теплице, которую им оставила мать. Отобран на шесть фестивалей.",
        kk: "Екі апалы-сіңлі және аналары қалдырған жылыжай туралы қысқаметражды фильм. Алты фестивальге іріктелді."
      },
      credits: { director: "Sarah Whitmore", dop: "Elena Marchetti", producer: "James Calloway", editor: "Daniel Okafor" }
    },
    {
      slug: "thames-5am", title: "Thames, 5AM", cat: "doc", year: 2023, client: "Meridian Air", poster: 1,
      video: "assets/video/thames-5am.mp4",
      role: { en: "Branded documentary", ru: "Брендированная документалистика", kk: "Брендтік деректі фильм" },
      text: {
        en: "Twelve people who work the river before the city wakes up. A branded short that never shows a logo.",
        ru: "Двенадцать человек, которые работают на реке, пока город спит. Брендированный фильм, в котором ни разу не появляется логотип.",
        kk: "Қала оянбай тұрып өзенде жұмыс істейтін он екі адам. Логотип бір рет те көрінбейтін брендтік фильм."
      },
      credits: { director: "Sarah Whitmore", dop: "Elena Marchetti", producer: "Priya Nair", editor: "Daniel Okafor" }
    },
    {
      slug: "first-pour", title: "First Pour", cat: "commercial", year: 2023, client: "Ember Roasters", poster: 4,
      video: "assets/video/first-pour.mp4",
      role: { en: "Production & post", ru: "Продакшн и пост", kk: "Продакшн және пост" },
      text: {
        en: "Three 15-second spots shot at 1,000 fps. Coffee, steam and very precise timing.",
        ru: "Три 15-секундных ролика, снятых на 1000 кадров в секунду. Кофе, пар и очень точный тайминг.",
        kk: "Секундына 1000 кадрмен түсірілген үш 15 секундтық ролик. Кофе, бу және өте дәл тайминг."
      },
      credits: { director: "James Calloway", dop: "Elena Marchetti", producer: "Priya Nair", editor: "Marcus Lindgren" }
    },
    {
      slug: "velvet-hours", title: "Velvet Hours", cat: "music", year: 2022, client: "Rough Echo Records", poster: 3,
      video: "assets/video/velvet-hours.mp4",
      role: { en: "Full production", ru: "Полный продакшн", kk: "Толық продакшн" },
      text: {
        en: "A late-night drive through Soho, shot on Mini LF with the band in the back seat.",
        ru: "Ночная поездка по Сохо, снятая на Mini LF, — группа на заднем сиденье.",
        kk: "Сохо арқылы түнгі сапар, Mini LF-пен түсірілген — топ артқы орындықта."
      },
      credits: { director: "Chloe Bennett", dop: "Elena Marchetti", producer: "Priya Nair", editor: "Daniel Okafor" }
    },
    {
      slug: "quiet-rooms", title: "Quiet Rooms", cat: "film", year: 2022, client: "Saltwater Films", poster: 2,
      video: "assets/video/quiet-rooms.mp4",
      role: { en: "Co-production", ru: "Копродукция", kk: "Бірлескен өндіріс" },
      text: {
        en: "A chamber drama set across one night in a Pimlico hotel. Our first feature.",
        ru: "Камерная драма об одной ночи в отеле в Пимлико. Наш первый полный метр.",
        kk: "Пимликодағы қонақүйдегі бір түн туралы камералық драма. Біздің алғашқы толық метражды фильміміз."
      },
      credits: { director: "Sarah Whitmore", dop: "Elena Marchetti", producer: "James Calloway", editor: "Daniel Okafor" }
    },
    {
      slug: "long-run", title: "The Long Run", cat: "doc", year: 2022, client: "Kestrel Sport", poster: 6,
      video: "assets/video/long-run.mp4",
      role: { en: "Production", ru: "Продакшн", kk: "Продакшн" },
      text: {
        en: "Following a 61-year-old ultrarunner across the Pennine Way. 431 km, one camera team.",
        ru: "61-летний ультрамарафонец на маршруте Pennine Way. 431 км, одна операторская группа.",
        kk: "Pennine Way бағытындағы 61 жастағы ультрамарафоншы. 431 км, бір операторлық топ."
      },
      credits: { director: "James Calloway", dop: "Elena Marchetti", producer: "Priya Nair", editor: "Daniel Okafor" }
    }
  ],

  team: [
    { name: "Sarah Whitmore", hue: "#0B2A6F",
      role: { en: "Founder, Director", ru: "Основатель, режиссёр", kk: "Негізін қалаушы, режиссёр" },
      quote: { en: "If I can't see the film, I can't make it.", ru: "Если я не вижу фильм — я не могу его снять.", kk: "Фильмді көрмесем — оны түсіре алмаймын." } },
    { name: "James Calloway", hue: "#D62828",
      role: { en: "Executive Producer", ru: "Исполнительный продюсер", kk: "Атқарушы продюсер" },
      quote: { en: "A good schedule is invisible.", ru: "Хороший график незаметен.", kk: "Жақсы кесте көзге көрінбейді." } },
    { name: "Elena Marchetti", hue: "#1F4FB5",
      role: { en: "Director of Photography", ru: "Директор по фотографии", kk: "Фотография директоры" },
      quote: { en: "Light the face, then light the room.", ru: "Сначала свет на лицо, потом на комнату.", kk: "Алдымен бетке жарық, содан кейін бөлмеге." } },
    { name: "Daniel Okafor", hue: "#0B2A6F",
      role: { en: "Editor & Colourist", ru: "Монтажёр и колорист", kk: "Монтажшы және колорист" },
      quote: { en: "The cut is where the film tells the truth.", ru: "В монтаже фильм говорит правду.", kk: "Монтажда фильм шындықты айтады." } },
    { name: "Priya Nair", hue: "#D62828",
      role: { en: "Producer", ru: "Продюсер", kk: "Продюсер" },
      quote: { en: "Every yes costs something. I count it.", ru: "Каждое «да» чего-то стоит. Я это считаю.", kk: "Әр «иә» бір нәрсеге тұрады. Мен соны есептеймін." } },
    { name: "Thomas Reid", hue: "#1F4FB5",
      role: { en: "Sound Designer", ru: "Звукорежиссёр", kk: "Дыбыс режиссёры" },
      quote: { en: "Half of what you see, you hear.", ru: "Половину того, что вы видите, вы слышите.", kk: "Көргеніңіздің жартысын естисіз." } },
    { name: "Chloe Bennett", hue: "#0B2A6F",
      role: { en: "Art Director", ru: "Арт-директор", kk: "Арт-директор" },
      quote: { en: "Every object in frame should earn its place.", ru: "Каждый предмет в кадре должен заслужить своё место.", kk: "Кадрдағы әр зат өз орнына лайық болуы керек." } },
    { name: "Marcus Lindgren", hue: "#D62828",
      role: { en: "VFX Supervisor", ru: "VFX-супервайзер", kk: "VFX-супервайзер" },
      quote: { en: "The best effect is the one nobody notices.", ru: "Лучший эффект — тот, которого никто не заметил.", kk: "Ең жақсы эффект — ешкім байқамағаны." } }
  ],

  reviews: [
    { name: "Hannah Locke", company: "Aurelia", logo: "AURELIA",
      title: { en: "Head of Brand", ru: "Руководитель бренда", kk: "Бренд жетекшісі" },
      quote: { en: "They pushed back on our brief, and they were right. The film outperformed everything we've made in five years.", ru: "Они спорили с нашим брифом — и оказались правы. Ролик превзошёл всё, что мы сделали за пять лет.", kk: "Олар біздің брифке қарсы шықты — және дұрыс болып шықты. Ролик соңғы бес жылда жасағанымыздың бәрінен асып түсті." } },
    { name: "Mara Vey", company: "Rough Echo Records", logo: "ROUGH ECHO",
      title: { en: "Recording artist", ru: "Музыкант", kk: "Музыкант" },
      quote: { en: "Sarah understood the song before I'd finished explaining it.", ru: "Сара поняла песню раньше, чем я закончила её объяснять.", kk: "Мен түсіндіріп болмай жатып, Сара әнді түсінді." } },
    { name: "Owen Hartley", company: "Northlight Pictures", logo: "NORTHLIGHT",
      title: { en: "Managing Director", ru: "Управляющий директор", kk: "Басқарушы директор" },
      quote: { en: "On budget, on schedule, and still the most ambitious thing on our slate.", ru: "В рамках бюджета, в срок — и всё равно самый амбициозный проект в нашем портфеле.", kk: "Бюджет шегінде, уақытында — және бәрібір біздің жоспардағы ең батыл жоба." } },
    { name: "Lucía Ferrer", company: "Vela Motors", logo: "VELA",
      title: { en: "Marketing Director, UK", ru: "Директор по маркетингу, Великобритания", kk: "Маркетинг директоры, Ұлыбритания" },
      quote: { en: "Calm crew, no drama, and footage our global team is still borrowing.", ru: "Спокойная группа, никакой драмы и материал, который наша глобальная команда до сих пор использует.", kk: "Тыныш топ, ешқандай драма жоқ және жаһандық командамыз әлі күнге дейін пайдаланатын материал." } },
    { name: "Ben Adeyemi", company: "Saltwater Films", logo: "SALTWATER",
      title: { en: "Producer", ru: "Продюсер", kk: "Продюсер" },
      quote: { en: "A year in a shipyard is hard. They made it look like they lived there.", ru: "Год на верфи — это тяжело. Они сделали так, будто жили там.", kk: "Кеме зауытындағы бір жыл — ауыр. Олар сол жерде тұрғандай етіп көрсетті." } },
    { name: "Grace Whitfield", company: "Ember Roasters", logo: "EMBER",
      title: { en: "Founder", ru: "Основатель", kk: "Негізін қалаушы" },
      quote: { en: "Small brand, big-studio care. We'll be back for every campaign.", ru: "Маленький бренд, а отношение как у большой студии. Вернёмся на каждую кампанию.", kk: "Шағын бренд, бірақ үлкен студиядай қамқорлық. Әр науқанға қайта ораламыз." } }
  ],

  press: [
    { src: "Little White Lies", quote: { en: "A quiet, confident debut.", ru: "Тихий и уверенный дебют.", kk: "Тыныш әрі сенімді дебют." } },
    { src: "Shots", quote: { en: "One of London's most interesting small studios.", ru: "Одна из самых интересных небольших студий Лондона.", kk: "Лондондағы ең қызықты шағын студиялардың бірі." } },
    { src: "British Cinematographer", quote: { en: "Images that trust the audience.", ru: "Изображение, которое доверяет зрителю.", kk: "Көрерменге сенетін бейне." } }
  ],

  awards: [
    { year: 2025, title: "Low Tide", sub: { en: "Best Cinematography — London Short Film Festival", ru: "Лучшая операторская работа — London Short Film Festival", kk: "Үздік операторлық жұмыс — London Short Film Festival" } },
    { year: 2025, title: "Halcyon", sub: { en: "Gold, Craft: Cinematography — British Arrows", ru: "Золото, Craft: операторская работа — British Arrows", kk: "Алтын, Craft: операторлық жұмыс — British Arrows" } },
    { year: 2024, title: "Iron & Salt", sub: { en: "Best Documentary — Sheffield DocFest, Official Selection", ru: "Лучший документальный фильм — Sheffield DocFest, официальная программа", kk: "Үздік деректі фильм — Sheffield DocFest, ресми бағдарлама" } },
    { year: 2024, title: "Paper Moons", sub: { en: "Best Music Video — UK Music Video Awards, Shortlist", ru: "Лучший клип — UK Music Video Awards, шорт-лист", kk: "Үздік клип — UK Music Video Awards, қысқа тізім" } },
    { year: 2023, title: "Glasshouse", sub: { en: "Jury Prize — Encounters Film Festival", ru: "Приз жюри — Encounters Film Festival", kk: "Қазылар алқасының жүлдесі — Encounters Film Festival" } },
    { year: 2023, title: "Thames, 5AM", sub: { en: "Best Branded Documentary — Cannes Corporate Media & TV Awards", ru: "Лучший брендированный документальный фильм — Cannes Corporate Media & TV Awards", kk: "Үздік брендтік деректі фильм — Cannes Corporate Media & TV Awards" } },
    { year: 2022, title: "Quiet Rooms", sub: { en: "Official Selection — Edinburgh International Film Festival", ru: "Официальная программа — Эдинбургский международный кинофестиваль", kk: "Ресми бағдарлама — Эдинбург халықаралық кинофестивалі" } },
    { year: 2022, title: "Velvet Hours", sub: { en: "Best Cinematography — Berlin Music Video Awards", ru: "Лучшая операторская работа — Berlin Music Video Awards", kk: "Үздік операторлық жұмыс — Berlin Music Video Awards" } }
  ],

  equipment: [
    { key: "cameras", items: [
      ["ARRI Alexa 35", { en: "4.6K Super 35, 17 stops, REVEAL colour", ru: "4.6K Super 35, 17 стопов, цвет REVEAL", kk: "4.6K Super 35, 17 стоп, REVEAL түсі" }],
      ["ARRI Alexa Mini LF", { en: "4.5K large format, compact body", ru: "4.5K, большой формат, компактный корпус", kk: "4.5K, үлкен формат, ықшам корпус" }],
      ["RED V-Raptor", { en: "8K VV, up to 120 fps", ru: "8K VV, до 120 кадров/с", kk: "8K VV, 120 кадр/с дейін" }],
      ["Sony FX6", { en: "Full frame, documentary & run-and-gun", ru: "Полный кадр, документалистика и репортаж", kk: "Толық кадр, деректі кино және репортаж" }]
    ] },
    { key: "lenses", items: [
      ["Zeiss Supreme Prime", { en: "Full set, 15–200 mm, T1.5", ru: "Полный комплект, 15–200 мм, T1.5", kk: "Толық жинақ, 15–200 мм, T1.5" }],
      ["Cooke S4/i", { en: "18–135 mm, the Cooke Look", ru: "18–135 мм, фирменный Cooke Look", kk: "18–135 мм, фирмалық Cooke Look" }],
      ["Atlas Orion Anamorphic", { en: "2× squeeze, 32–100 mm", ru: "Сжатие 2×, 32–100 мм", kk: "2× сығу, 32–100 мм" }]
    ] },
    { key: "light", items: [
      ["ARRI SkyPanel S60 / S360", { en: "Full-colour LED soft sources", ru: "Полноцветные LED-панели мягкого света", kk: "Толық түсті жұмсақ LED панельдер" }],
      ["Aputure 600d Pro", { en: "Daylight point source, weather-resistant", ru: "Точечный дневной свет, защита от погоды", kk: "Нүктелік күндізгі жарық, ауа райынан қорғалған" }],
      ["Kino Flo Celeb / FreeStyle", { en: "Soft, low-profile fixtures", ru: "Мягкий свет, тонкие приборы", kk: "Жұмсақ жарық, жұқа құрылғылар" }]
    ] },
    { key: "sound", items: [
      ["Sound Devices 833", { en: "8-channel recorder / mixer", ru: "8-канальный рекордер / микшер", kk: "8 арналы рекордер / микшер" }],
      ["Sennheiser MKH 416", { en: "Short shotgun microphones", ru: "Короткие микрофоны-пушки", kk: "Қысқа бағытталған микрофондар" }],
      ["Lectrosonics", { en: "Digital wireless, 8 channels", ru: "Цифровые радиосистемы, 8 каналов", kk: "Сандық радиожүйелер, 8 арна" }]
    ] },
    { key: "motion", items: [
      ["DJI Ronin 2", { en: "3-axis stabiliser, vehicle mounts", ru: "3-осевой стабилизатор, крепления на авто", kk: "3 осьті тұрақтандырғыш, көлікке бекіткіштер" }],
      ["Steadicam", { en: "With in-house operator", ru: "С собственным оператором", kk: "Өз операторымызбен" }],
      ["DJI Inspire 3", { en: "8K aerial, CAA-licensed pilots", ru: "8K аэросъёмка, пилоты с лицензией CAA", kk: "8K әуе түсірілімі, CAA лицензиясы бар пилоттар" }],
      [{ en: "Slider & jib", ru: "Слайдер и джиб", kk: "Слайдер және джиб" }, { en: "1.5 m slider, 6 m jib arm", ru: "Слайдер 1,5 м, кран 6 м", kk: "1,5 м слайдер, 6 м кран" }]
    ] },
    { key: "post", items: [
      ["DaVinci Resolve Studio", { en: "Edit and conform suites", ru: "Монтажные аппаратные", kk: "Монтаж бөлмелері" }],
      [{ en: "Colour grading", ru: "Цветокоррекция", kk: "Түс түзету" }, { en: "HDR grading room, calibrated reference monitor", ru: "Аппаратная для HDR, откалиброванный референсный монитор", kk: "HDR бөлмесі, калибрленген референс монитор" }],
      [{ en: "Sound studio", ru: "Студия звукозаписи", kk: "Дыбыс жазу студиясы" }, { en: "5.1 mix, ADR and voice-over booth", ru: "Сведение 5.1, ADR и дикторская кабина", kk: "5.1 араластыру, ADR және диктор кабинасы" }]
    ] }
  ]
};
