/**
 * URLs par défaut pour scraper tout le catalogue de chaque source.
 * Pas besoin de configurer d'URLs manuellement - le script utilise ces URLs "tout scraper".
 */
export const DEFAULT_SCRAPER_URLS = {
  autoscout24: [
    'https://www.autoscout24.be/nl/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.it/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.at/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.nl/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.es/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.fr/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    'https://www.autoscout24.lu/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C'
  ],
  'mobile.de': [
    'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car'
  ],
  leboncoin: [
    'https://www.leboncoin.fr/recherche?category=2&sort=time&order=desc',
    'https://www.leboncoin.fr/c/voitures'
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
    'https://www.bilweb.se/bilar'
  ],
  bytbil: [
    'https://www.bytbil.com/bilar'
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
