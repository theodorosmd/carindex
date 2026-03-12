/**
 * URLs par défaut pour scraper tout le catalogue de chaque source.
 * Pas besoin de configurer d'URLs manuellement - le script utilise ces URLs "tout scraper".
 */
export const DEFAULT_SCRAPER_URLS = {
  autoscout24: [
    // Base par pays (8 pays)
    'https://www.autoscout24.be/nl/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.it/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.at/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.nl/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.es/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.fr/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.lu/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    // Par marque (DE, FR, IT, NL, ES) – contourne limite 20 pages/recherche
    'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=9',
    'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=22',
    'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=17',
    'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=3',
    'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=51',
    'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=16',
    'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=55',
    'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=58',
    'https://www.autoscout24.fr/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=9',
    'https://www.autoscout24.fr/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=22',
    'https://www.autoscout24.fr/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=17',
    'https://www.autoscout24.fr/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=3',
    'https://www.autoscout24.fr/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=55',
    'https://www.autoscout24.it/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=9',
    'https://www.autoscout24.it/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=22',
    'https://www.autoscout24.it/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=17',
    'https://www.autoscout24.it/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=55',
    'https://www.autoscout24.nl/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=9',
    'https://www.autoscout24.nl/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=22',
    'https://www.autoscout24.es/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=9',
    'https://www.autoscout24.es/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C&make=22',
  ],
  'mobile.de': [
    // Base URL – all cars, newest first
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING',
    // By make (mak=ID) – broader coverage, parallel scraping
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=9&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING',   // VW
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=22&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING',  // BMW
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=17&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Mercedes
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=3&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING',   // Audi
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=51&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Opel
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=16&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Ford
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=55&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Renault
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=58&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Skoda
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=34&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Hyundai
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=59&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Toyota
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=50&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Nissan
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=40&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Mazda
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=8&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING',  // Volvo
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=30&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Porsche
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=56&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Seat
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=15&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Fiat
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=31&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Kia
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=38&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Mini
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=6&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING',  // Citroën
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&mak=52&sortOption.0.sortBy=creationTime&sortOption.0.order=DESCENDING', // Peugeot
  ],
  leboncoin: [
    'https://www.leboncoin.fr/recherche?category=2&sort=time&order=desc'
  ],
  largus: [
    'https://occasion.largus.fr/auto/?npp=15'
  ],
  lacentrale: [
    'https://www.lacentrale.fr/listing'
  ],
  gaspedaal: [
    'https://www.gaspedaal.nl/zoeken?srt=df-a'
  ],
  marktplaats: [
    'https://www.marktplaats.nl/l/auto-s/#f:10882'
  ],
  subito: [
    'https://www.subito.it/auto-usate/italia'
  ],
  'coches.net': [
    'https://www.coches.net/segunda-mano/coches'
  ],
  blocket: [
    'https://www.blocket.se/mobility/search/car'
  ],
  bilweb: [
    'https://bilweb.se/sok'
  ],
  bytbil: [
    'https://www.bytbil.com/bil/volkswagen',
    'https://www.bytbil.com/bil/volvo',
    'https://www.bytbil.com/bil/bmw',
    'https://www.bytbil.com/bil/audi',
    'https://www.bytbil.com/bil/toyota',
    'https://www.bytbil.com/bil/mercedes-benz',
    'https://www.bytbil.com/bil/ford',
    'https://www.bytbil.com/bil/kia',
    'https://www.bytbil.com/bil/skoda',
    'https://www.bytbil.com/bil/hyundai',
  ],
  finn: [
    'https://www.finn.no/mobility/search/car?registration_class=1'
  ],
  otomoto: [
    'https://www.otomoto.pl/osobowe'
  ],
  '2ememain': [
    'https://www.2ememain.be/l/autos/#f:10882'
  ]
};
