// The initial 50 placement targets for the benzinradar.com seeding campaign.
// Driver / taxi / auto / city-news communities (NOT flea-markets — off-topic there).
// `members` is the catalog snapshot only; the live check-chat assessment overrides it.

export interface TargetSeed {
  handle: string
  city: string
  category: 'такси' | 'доставка' | 'авто' | 'город-news' | 'город-чат'
  title: string
  members: number | null
}

export const TARGET_SEEDS: ReadonlyArray<TargetSeed> = [
  { handle: 'taximoskva4at', city: 'Москва', category: 'такси', title: 'Такси Москва. Чат', members: 29800 },
  { handle: 'taxiwoditeli', city: 'вся РФ', category: 'такси', title: 'Такси Россия все города', members: 26000 },
  { handle: 'taximoskvarussia', city: 'Москва', category: 'такси', title: 'Чат Такси Москва/Россия', members: 18800 },
  { handle: 'igormylnikovchannelchat', city: 'вся РФ', category: 'такси', title: 'О работе водителем такси', members: 18000 },
  { handle: 'taxieconomy', city: 'Железногорск', category: 'такси', title: 'Такси Эконом Железногорск', members: 17800 },
  { handle: 'taxiyakutia', city: 'Якутск', category: 'такси', title: 'Такси по городу Якутск', members: 11900 },
  { handle: 'ekispire', city: 'Воронеж/Москва', category: 'такси', title: 'Воронеж-Москва Такси', members: 10500 },
  { handle: 'poputka_taxi_obratka', city: 'межгород', category: 'такси', title: 'Такси Межгород (обратка)', members: 9550 },
  { handle: 'TAXI_82', city: 'Крым', category: 'такси', title: 'Крымское Такси', members: 8300 },
  { handle: 'gruzotaxi_gruzchiki_moskva', city: 'Москва', category: 'такси', title: 'Грузотакси/грузчики Москва', members: 7300 },
  { handle: 'taxidonbasa', city: 'Донецк', category: 'такси', title: 'Такси Донецк', members: 7300 },
  { handle: 'taxsimuy', city: 'межгород', category: 'такси', title: 'МОЁ-ТАКСИ Межгород', members: 5775 },
  { handle: 'taxipitermoskow_obsujdeniye', city: 'СПб/Москва', category: 'такси', title: 'Такси Питер-Москва', members: 4121 },
  { handle: 'transfer_taxi_poezdki', city: 'межгород', category: 'такси', title: 'Такси Межгород 24/7', members: 3774 },
  { handle: 'izgorodavgorod', city: 'межгород', category: 'такси', title: 'Город в Город', members: 3201 },
  { handle: 'taxi_yaroslavl76', city: 'Ярославль', category: 'такси', title: 'Такси Ярославль', members: 2300 },
  { handle: 'taxi_vladivostok', city: 'Владивосток', category: 'такси', title: 'Такси Владивосток', members: 2300 },
  { handle: 'taxidonbas', city: 'ДНР-ЛНР', category: 'такси', title: 'Такси ДНР-ЛНР-Россия', members: 2100 },
  { handle: 'taxi_nnovgorod', city: 'Нижний Новгород', category: 'такси', title: 'Такси Нижний Новгород', members: 1600 },
  { handle: 'taxi_bveshensk', city: 'Благовещенск', category: 'такси', title: 'Такси Благовещенск', members: 1300 },
  { handle: 'belgorodtaxi', city: 'Белгород', category: 'такси', title: 'Такси Белгород Валуйки', members: 478 },
  { handle: 'taksikazani', city: 'Казань', category: 'такси', title: 'Чат Такси Казани (водители)', members: null },
  { handle: 'chat_taxi_mezhgorod', city: 'межгород', category: 'такси', title: 'Чат ГК Межгород', members: null },
  { handle: 'taxi_moscow777', city: 'Москва', category: 'такси', title: 'Такси Москва', members: null },
  { handle: 'dostaffkzn', city: 'Казань', category: 'доставка', title: 'Казань Доставка и Курьеры', members: null },
  { handle: 'dorogachat', city: 'вся РФ', category: 'авто', title: 'Чат автомобилистов (дорога)', members: null },
  { handle: 'nijerinka_RF', city: 'вся РФ', category: 'авто', title: 'Авто Ниже Рынка РФ', members: null },
  { handle: 'automarket63', city: 'Самара', category: 'авто', title: 'Авто Самара', members: 19900 },
  { handle: 'avtorynok_chat', city: 'Москва', category: 'авто', title: 'Авторынок Москва', members: 12500 },
  { handle: 'kazanavto_116', city: 'Казань', category: 'авто', title: 'Авто Казань', members: 3800 },
  { handle: 'avto_tula71', city: 'Тула', category: 'авто', title: 'Тула Авто', members: 2400 },
  { handle: 'autoelb', city: 'Елабуга', category: 'авто', title: 'Авто Елабуга', members: 2200 },
  { handle: 'gemagogi', city: 'Владивосток', category: 'авто', title: 'Продажа авто Владивосток', members: 2100 },
  { handle: 'tmn_avto', city: 'Тюмень', category: 'авто', title: 'Продажа авто Тюмень', members: 1800 },
  { handle: 'ekatglavnoe', city: 'Екатеринбург', category: 'город-news', title: 'Екатеринбург. Главное', members: null },
  { handle: 'krasnodarkray1', city: 'Краснодар', category: 'город-news', title: 'Краснодар и край', members: null },
  { handle: 'mtrk_krasnodar', city: 'Краснодар', category: 'город-news', title: 'МТРК Краснодар', members: null },
  { handle: 'krasnodarregion', city: 'Краснодарский край', category: 'город-news', title: 'Краснодарский край', members: null },
  { handle: 'krdru', city: 'Краснодар', category: 'город-news', title: 'KRD.RU', members: null },
  { handle: 'tvkrasnodar', city: 'Краснодар', category: 'город-news', title: 'Телеканал Краснодар', members: null },
  { handle: 'ki_krd', city: 'Краснодар', category: 'город-news', title: 'Краснодарские известия', members: null },
  { handle: 'chelyabinsk_chat_gruppa', city: 'Челябинск', category: 'город-чат', title: 'Челябинск чат', members: null },
  { handle: 'ufa_gruppa_obyavlenia', city: 'Уфа', category: 'город-чат', title: 'Уфа объявления', members: null },
  { handle: 'novosibirsk_gruppa', city: 'Новосибирск', category: 'город-чат', title: 'Новосибирск группа', members: null },
  { handle: 'samara_novosty_goroda', city: 'Самара', category: 'город-чат', title: 'Самара новости города', members: null },
  { handle: 'tvoynsk', city: 'Новосибирск', category: 'город-чат', title: 'Ваш Новосибирск', members: null },
  { handle: 'kazanchat', city: 'Казань', category: 'город-чат', title: 'Казань чат', members: null },
  { handle: 'locality_ekb', city: 'Екатеринбург', category: 'город-чат', title: 'Чат районов Екатеринбурга', members: null },
  { handle: 'gorodov_chaty', city: 'вся РФ', category: 'город-чат', title: 'Чаты городов', members: null },
  { handle: 'ufachat', city: 'Уфа', category: 'город-чат', title: 'Уфа чат', members: null },
]

// The 3 approved message variants (native "I found this, sharing" tone).
export const MESSAGE_VARIANTS: ReadonlyArray<string> = [
  'Если пригодится: нашёл карту, где люди отмечают наличие топлива на АЗС. Можно быстро глянуть и при желании добавить свою отметку. https://benzinradar.com',
  'Нашёл карту наличия бензина на АЗС. Если кто-то сегодня заправлялся — можно отметить свою заправку, чтобы другим было проще ориентироваться. https://benzinradar.com',
  'Тут можно посмотреть наличие топлива на АЗС — карта пополняется самими водителями, чем больше отметок, тем точнее. https://benzinradar.com',
]
