/**
 * Shared location utilities: region maps and parsing helpers.
 * Centralizes data previously duplicated across leboncoin, lacentrale,
 * gaspedaal, subito, and blocket scrapers.
 */

// ---------------------------------------------------------------------------
// France: department code → region name
// ---------------------------------------------------------------------------
export const FRENCH_DEPT_TO_REGION = {
  '01': 'Auvergne-Rhône-Alpes', '03': 'Auvergne-Rhône-Alpes', '07': 'Auvergne-Rhône-Alpes',
  '15': 'Auvergne-Rhône-Alpes', '26': 'Auvergne-Rhône-Alpes', '38': 'Auvergne-Rhône-Alpes',
  '42': 'Auvergne-Rhône-Alpes', '43': 'Auvergne-Rhône-Alpes', '63': 'Auvergne-Rhône-Alpes',
  '69': 'Auvergne-Rhône-Alpes', '73': 'Auvergne-Rhône-Alpes', '74': 'Auvergne-Rhône-Alpes',
  '21': 'Bourgogne-Franche-Comté', '25': 'Bourgogne-Franche-Comté', '39': 'Bourgogne-Franche-Comté',
  '58': 'Bourgogne-Franche-Comté', '70': 'Bourgogne-Franche-Comté', '71': 'Bourgogne-Franche-Comté',
  '89': 'Bourgogne-Franche-Comté', '90': 'Bourgogne-Franche-Comté',
  '22': 'Bretagne', '29': 'Bretagne', '35': 'Bretagne', '56': 'Bretagne',
  '18': 'Centre-Val de Loire', '28': 'Centre-Val de Loire', '36': 'Centre-Val de Loire',
  '37': 'Centre-Val de Loire', '41': 'Centre-Val de Loire', '45': 'Centre-Val de Loire',
  '2A': 'Corse', '2B': 'Corse', '20': 'Corse',
  '08': 'Grand Est', '10': 'Grand Est', '51': 'Grand Est', '52': 'Grand Est',
  '54': 'Grand Est', '55': 'Grand Est', '57': 'Grand Est', '67': 'Grand Est', '68': 'Grand Est', '88': 'Grand Est',
  '02': 'Hauts-de-France', '59': 'Hauts-de-France', '60': 'Hauts-de-France',
  '62': 'Hauts-de-France', '80': 'Hauts-de-France',
  '75': 'Île-de-France', '77': 'Île-de-France', '78': 'Île-de-France', '91': 'Île-de-France',
  '92': 'Île-de-France', '93': 'Île-de-France', '94': 'Île-de-France', '95': 'Île-de-France',
  '14': 'Normandie', '27': 'Normandie', '50': 'Normandie', '61': 'Normandie', '76': 'Normandie',
  '16': 'Nouvelle-Aquitaine', '17': 'Nouvelle-Aquitaine', '19': 'Nouvelle-Aquitaine',
  '23': 'Nouvelle-Aquitaine', '24': 'Nouvelle-Aquitaine', '33': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine', '47': 'Nouvelle-Aquitaine', '64': 'Nouvelle-Aquitaine',
  '79': 'Nouvelle-Aquitaine', '86': 'Nouvelle-Aquitaine', '87': 'Nouvelle-Aquitaine',
  '09': 'Occitanie', '11': 'Occitanie', '12': 'Occitanie', '30': 'Occitanie',
  '31': 'Occitanie', '32': 'Occitanie', '34': 'Occitanie', '46': 'Occitanie',
  '48': 'Occitanie', '65': 'Occitanie', '66': 'Occitanie', '81': 'Occitanie', '82': 'Occitanie',
  '44': 'Pays de la Loire', '49': 'Pays de la Loire', '53': 'Pays de la Loire',
  '72': 'Pays de la Loire', '85': 'Pays de la Loire',
  '04': "Provence-Alpes-Côte d'Azur", '05': "Provence-Alpes-Côte d'Azur",
  '06': "Provence-Alpes-Côte d'Azur", '13': "Provence-Alpes-Côte d'Azur",
  '83': "Provence-Alpes-Côte d'Azur", '84': "Provence-Alpes-Côte d'Azur",
  '971': 'Guadeloupe', '972': 'Martinique', '973': 'Guyane', '974': 'La Réunion', '976': 'Mayotte',
};

/**
 * Look up French region from zipcode (uses first 2–3 digits as dept code).
 * @param {string} zipcode - French postal code (e.g. "75008", "971XX")
 */
export function frenchRegionFromZipcode(zipcode) {
  if (!zipcode) return null;
  const z = String(zipcode).trim();
  // DOM-TOM: 3-digit prefix (971–976)
  if (/^97[1-6]/.test(z)) return FRENCH_DEPT_TO_REGION[z.slice(0, 3)] || null;
  // Mainland: 2-digit prefix
  return FRENCH_DEPT_TO_REGION[z.slice(0, 2)] || null;
}

/**
 * Parse a French location string "CityName 75008" → { city, zipcode }
 * @param {string} text
 */
export function parseFrenchLocation(text) {
  if (!text) return null;
  const m = text.trim().match(/^([A-ZÀ-Üa-zà-ü-]+(?:\s+[A-ZÀ-Üa-zà-ü-]+)*)\s+(\d{5})$/);
  if (!m) return null;
  return { city: m[1], zipcode: m[2] };
}

// ---------------------------------------------------------------------------
// Netherlands: province code → province/region name
// ---------------------------------------------------------------------------
export const DUTCH_PROVINCE_TO_REGION = {
  DR: 'Drenthe',
  FL: 'Flevoland',
  FR: 'Friesland',
  GE: 'Gelderland',
  GR: 'Groningen',
  LI: 'Limburg',
  NB: 'Noord-Brabant',
  NH: 'Noord-Holland',
  OV: 'Overijssel',
  UT: 'Utrecht',
  ZE: 'Zeeland',
  ZH: 'Zuid-Holland',
};

// ---------------------------------------------------------------------------
// Italy: province abbreviation → region name
// ---------------------------------------------------------------------------
export const ITALIAN_PROVINCE_TO_REGION = {
  AG: 'Sicilia', AL: 'Piemonte', AN: 'Marche', AO: "Valle d'Aosta",
  AP: 'Marche', AQ: 'Abruzzo', AR: 'Toscana', AT: 'Piemonte',
  AV: 'Campania', BA: 'Puglia', BG: 'Lombardia', BI: 'Piemonte',
  BL: 'Veneto', BN: 'Campania', BO: 'Emilia-Romagna', BR: 'Puglia',
  BS: 'Lombardia', BT: 'Puglia', BZ: 'Trentino-Alto Adige',
  CA: 'Sardegna', CB: 'Molise', CE: 'Campania', CH: 'Abruzzo',
  CI: 'Sardegna', CL: 'Sicilia', CN: 'Piemonte', CO: 'Lombardia',
  CR: 'Lombardia', CS: 'Calabria', CT: 'Sicilia', CZ: 'Calabria',
  EN: 'Sicilia', FC: 'Emilia-Romagna', FE: 'Emilia-Romagna',
  FG: 'Puglia', FI: 'Toscana', FM: 'Marche', FR: 'Lazio',
  GE: 'Liguria', GO: 'Friuli Venezia Giulia', GR: 'Toscana',
  IM: 'Liguria', IS: 'Molise', KR: 'Calabria', LC: 'Lombardia',
  LE: 'Puglia', LI: 'Toscana', LO: 'Lombardia', LT: 'Lazio',
  LU: 'Toscana', MB: 'Lombardia', MC: 'Marche', ME: 'Sicilia',
  MI: 'Lombardia', MN: 'Lombardia', MO: 'Emilia-Romagna',
  MS: 'Toscana', MT: 'Basilicata', NA: 'Campania', NO: 'Piemonte',
  NU: 'Sardegna', OG: 'Sardegna', OR: 'Sardegna', OT: 'Sardegna',
  PA: 'Sicilia', PC: 'Emilia-Romagna', PD: 'Veneto', PE: 'Abruzzo',
  PG: 'Umbria', PI: 'Toscana', PN: 'Friuli Venezia Giulia',
  PO: 'Toscana', PR: 'Emilia-Romagna', PT: 'Toscana', PU: 'Marche',
  PV: 'Lombardia', PZ: 'Basilicata', RA: 'Emilia-Romagna',
  RC: 'Calabria', RE: 'Emilia-Romagna', RG: 'Sicilia', RI: 'Lazio',
  RM: 'Lazio', RN: 'Emilia-Romagna', RO: 'Veneto',
  SA: 'Campania', SI: 'Toscana', SO: 'Lombardia', SP: 'Liguria',
  SR: 'Sicilia', SS: 'Sardegna', SU: 'Sardegna', SV: 'Liguria',
  TA: 'Puglia', TE: 'Abruzzo', TN: 'Trentino-Alto Adige',
  TO: 'Piemonte', TP: 'Sicilia', TR: 'Umbria', TS: 'Friuli Venezia Giulia',
  TV: 'Veneto', UD: 'Friuli Venezia Giulia', VA: 'Lombardia',
  VB: 'Piemonte', VC: 'Piemonte', VE: 'Veneto', VI: 'Veneto',
  VR: 'Veneto', VS: 'Sardegna', VT: 'Lazio', VV: 'Calabria',
};

// ---------------------------------------------------------------------------
// Sweden: city name (lowercase) → region (län)
// ---------------------------------------------------------------------------
export const SWEDISH_CITY_TO_REGION = {
  'stockholm': 'Stockholms län', 'solna': 'Stockholms län', 'sundbyberg': 'Stockholms län',
  'sollentuna': 'Stockholms län', 'järfälla': 'Stockholms län', 'täby': 'Stockholms län',
  'danderyd': 'Stockholms län', 'nacka': 'Stockholms län', 'lidingö': 'Stockholms län',
  'huddinge': 'Stockholms län', 'botkyrka': 'Stockholms län', 'haninge': 'Stockholms län',
  'tyresö': 'Stockholms län', 'värmdö': 'Stockholms län', 'gustavsberg': 'Stockholms län',
  'vällingby': 'Stockholms län', 'bandhagen': 'Stockholms län', 'kista': 'Stockholms län',
  'saltsjö-boo': 'Stockholms län', 'segeltorp': 'Stockholms län', 'kungens kurva': 'Stockholms län',
  'bromma': 'Stockholms län', 'hägersten': 'Stockholms län', 'enskede': 'Stockholms län',
  'farsta': 'Stockholms län', 'skärholmen': 'Stockholms län', 'älvsjö': 'Stockholms län',
  'spånga': 'Stockholms län', 'hässelby': 'Stockholms län', 'åkersberga': 'Stockholms län',
  'märsta': 'Stockholms län', 'sigtuna': 'Stockholms län', 'upplands väsby': 'Stockholms län',
  'norrtälje': 'Stockholms län', 'södertälje': 'Stockholms län', 'nynäshamn': 'Stockholms län',
  'vallentuna': 'Stockholms län', 'arlandastad': 'Stockholms län', 'rosersberg': 'Stockholms län',
  'kungsängen': 'Stockholms län', 'brandbergen': 'Stockholms län', 'handen': 'Stockholms län',
  'norsborg': 'Stockholms län', 'tullinge': 'Stockholms län', 'tumba': 'Stockholms län',
  'skogås': 'Stockholms län', 'rydboholm': 'Stockholms län', 'österhaninge': 'Stockholms län',
  'österskär': 'Stockholms län', 'angered': 'Västra Götalands län',

  'göteborg': 'Västra Götalands län', 'mölndal': 'Västra Götalands län',
  'borås': 'Västra Götalands län', 'trollhättan': 'Västra Götalands län',
  'uddevalla': 'Västra Götalands län', 'skövde': 'Västra Götalands län',
  'lidköping': 'Västra Götalands län', 'alingsås': 'Västra Götalands län',
  'kungälv': 'Västra Götalands län', 'lerum': 'Västra Götalands län',
  'partille': 'Västra Götalands län', 'kinna': 'Västra Götalands län',
  'svenljunga': 'Västra Götalands län', 'askim': 'Västra Götalands län',
  'hisings backa': 'Västra Götalands län', 'stora höga': 'Västra Götalands län',
  'vänersborg': 'Västra Götalands län', 'mariestad': 'Västra Götalands län',
  'falköping': 'Västra Götalands län', 'stenungsund': 'Västra Götalands län',
  'strömstad': 'Västra Götalands län', 'hisings kärra': 'Västra Götalands län',
  'herrljunga': 'Västra Götalands län', 'mölnlycke': 'Västra Götalands län',
  'sävedalen': 'Västra Götalands län', 'västra frölunda': 'Västra Götalands län',
  'ytterby': 'Västra Götalands län', 'öckerö': 'Västra Götalands län',
  'skene': 'Västra Götalands län', 'rångedala': 'Västra Götalands län',
  'ulricehamn': 'Västra Götalands län', 'tranemo': 'Västra Götalands län',
  'tidaholm': 'Västra Götalands län', 'stenstorp': 'Västra Götalands län',
  'vara': 'Västra Götalands län', 'vargön': 'Västra Götalands län',
  'kungshamn': 'Västra Götalands län', 'skee': 'Västra Götalands län',
  'karlsborg': 'Västra Götalands län', 'målsryd': 'Västra Götalands län',
  'torup': 'Västra Götalands län', 'åmål': 'Västra Götalands län',

  'malmö': 'Skåne län', 'helsingborg': 'Skåne län', 'lund': 'Skåne län',
  'kristianstad': 'Skåne län', 'landskrona': 'Skåne län', 'trelleborg': 'Skåne län',
  'ängelholm': 'Skåne län', 'eslöv': 'Skåne län', 'hässleholm': 'Skåne län',
  'ystad': 'Skåne län', 'tomelilla': 'Skåne län', 'simrishamn': 'Skåne län',
  'gärsnäs': 'Skåne län', 'viken': 'Skåne län', 'ödåkra': 'Skåne län',
  'staffanstorp': 'Skåne län', 'lomma': 'Skåne län', 'höganäs': 'Skåne län',
  'klippan': 'Skåne län', 'svalöv': 'Skåne län', 'sjöbo': 'Skåne län',
  'arlöv': 'Skåne län', 'bromölla': 'Skåne län', 'genarp': 'Skåne län',
  'hasslarp': 'Skåne län', 'hörby': 'Skåne län', 'mörarp': 'Skåne län',
  'nävlinge': 'Skåne län', 'osby': 'Skåne län', 'svedala': 'Skåne län',
  'vellinge': 'Skåne län',

  'uppsala': 'Uppsala län', 'bålsta': 'Uppsala län', 'knivsta': 'Uppsala län',
  'enköping': 'Uppsala län', 'tierp': 'Uppsala län',
  'alunda': 'Uppsala län', 'järlåsa': 'Uppsala län', 'östhammar': 'Uppsala län',

  'västerås': 'Västmanlands län', 'sala': 'Västmanlands län', 'köping': 'Västmanlands län',
  'arboga': 'Västmanlands län', 'hallstahammar': 'Västmanlands län',
  'surahammar': 'Västmanlands län', 'kungsör': 'Västmanlands län',

  'örebro': 'Örebro län', 'hallsberg': 'Örebro län', 'kumla': 'Örebro län',
  'lindesberg': 'Örebro län', 'karlskoga': 'Örebro län',

  'linköping': 'Östergötlands län', 'norrköping': 'Östergötlands län',
  'motala': 'Östergötlands län', 'mjölby': 'Östergötlands län',
  'mantorp': 'Östergötlands län', 'skänninge': 'Östergötlands län',
  'åtvidaberg': 'Östergötlands län',

  'jönköping': 'Jönköpings län', 'huskvarna': 'Jönköpings län',
  'nässjö': 'Jönköpings län', 'vetlanda': 'Jönköpings län',
  'skillingaryd': 'Jönköpings län', 'tranås': 'Jönköpings län',
  'gislaved': 'Jönköpings län', 'värnamo': 'Jönköpings län',
  'eksjö': 'Jönköpings län', 'hillerstorp': 'Jönköpings län',
  'sävsjö': 'Jönköpings län', 'taberg': 'Jönköpings län',

  'växjö': 'Kronobergs län', 'ljungby': 'Kronobergs län', 'alvesta': 'Kronobergs län',
  'älmhult': 'Kronobergs län',

  'kalmar': 'Kalmar län', 'nybro': 'Kalmar län', 'oskarshamn': 'Kalmar län',
  'västervik': 'Kalmar län', 'vimmerby': 'Kalmar län', 'borgholm': 'Kalmar län',

  'karlskrona': 'Blekinge län', 'karlshamn': 'Blekinge län',
  'ronneby': 'Blekinge län', 'olofström': 'Blekinge län',
  'sölvesborg': 'Blekinge län', 'mörrum': 'Blekinge län',

  'halmstad': 'Hallands län', 'varberg': 'Hallands län', 'kungsbacka': 'Hallands län',
  'falkenberg': 'Hallands län', 'laholm': 'Hallands län',

  'karlstad': 'Värmlands län', 'kristinehamn': 'Värmlands län',
  'arvika': 'Värmlands län', 'hagfors': 'Värmlands län', 'sunne': 'Värmlands län',
  'edsvalla': 'Värmlands län', 'skattkärr': 'Värmlands län',

  'falun': 'Dalarnas län', 'borlänge': 'Dalarnas län', 'mora': 'Dalarnas län',
  'ludvika': 'Dalarnas län', 'avesta': 'Dalarnas län', 'leksand': 'Dalarnas län',
  'rättvik': 'Dalarnas län', 'smedjebacken': 'Dalarnas län', 'säter': 'Dalarnas län',
  'vansbro': 'Dalarnas län', 'krylbo': 'Dalarnas län',

  'gävle': 'Gävleborgs län', 'sandviken': 'Gävleborgs län',
  'hudiksvall': 'Gävleborgs län', 'bollnäs': 'Gävleborgs län',
  'söderhamn': 'Gävleborgs län', 'hofors': 'Gävleborgs län', 'valbo': 'Gävleborgs län',

  'sundsvall': 'Västernorrlands län', 'härnösand': 'Västernorrlands län',
  'timrå': 'Västernorrlands län', 'örnsköldsvik': 'Västernorrlands län',
  'kramfors': 'Västernorrlands län', 'sollefteå': 'Västernorrlands län',
  'ånge': 'Västernorrlands län', 'sundsbruk': 'Västernorrlands län',

  'östersund': 'Jämtlands län', 'sveg': 'Jämtlands län',
  'bräcke': 'Jämtlands län', 'frösön': 'Jämtlands län',

  'umeå': 'Västerbottens län', 'skellefteå': 'Västerbottens län',
  'lycksele': 'Västerbottens län', 'dorotea': 'Västerbottens län',
  'fredrika': 'Västerbottens län', 'moliden': 'Västerbottens län',
  'vindeln': 'Västerbottens län', 'vännäs': 'Västerbottens län',

  'luleå': 'Norrbottens län', 'piteå': 'Norrbottens län', 'boden': 'Norrbottens län',
  'kiruna': 'Norrbottens län', 'gällivare': 'Norrbottens län', 'kalix': 'Norrbottens län',

  'nyköping': 'Södermanlands län', 'eskilstuna': 'Södermanlands län',
  'katrineholm': 'Södermanlands län', 'strängnäs': 'Södermanlands län',
  'flen': 'Södermanlands län', 'oxelösund': 'Södermanlands län',
  'björkvik': 'Södermanlands län',

  'visby': 'Gotlands län',
};

/**
 * Parse a location string of the form "City (XX)" into city and province code.
 * Used by Gaspedaal (NL) and Subito (IT).
 * @param {string} text
 * @returns {{ city: string, provinceCode: string } | null}
 */
export function parseProvinceLocation(text) {
  if (!text) return null;
  const m = text.match(/([\wÀ-ÿ''\s-]+?)\s*\(([A-Z]{2})\)/);
  if (!m) return null;
  return { city: m[1].trim(), provinceCode: m[2] };
}
