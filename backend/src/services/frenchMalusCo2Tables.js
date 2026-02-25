/**
 * French CO2 Ecological Malus Tax Tables
 * 
 * Official barème tables for French ecological malus (malus écologique)
 * Based on WLTP CO2 emissions (g/km)
 * 
 * Tables are versioned by date ranges to support rule changes over time
 */

/**
 * Table version definitions with date ranges
 */
export const TABLE_VERSIONS = {
  TABLE_2024_A: {
    id: '2024_A',
    name: 'Barème 2024 (janvier 2024 - février 2025)',
    startDate: '2024-01-01',
    endDate: '2025-02-28',
    threshold: 118, // Below this CO2 level, malus = 0
    maxCap: 60000 // Maximum malus amount (for CO2 > 192 g/km)
  },
  TABLE_2025_B: {
    id: '2025_B',
    name: 'Barème 2025 (mars 2025 - décembre 2025)',
    startDate: '2025-03-01',
    endDate: '2025-12-31',
    threshold: 113, // Below this CO2 level, malus = 0
    maxCap: 70000 // Maximum malus amount (for CO2 > 192 g/km)
  }
};

/**
 * Table 2024-A: Barème from January 1, 2024 to February 28, 2025
 * Source: Service Public France
 */
const TABLE_2024_A_BRACKETS = [
  { co2_min: 118, co2_max: 118, malus_eur: 50 },
  { co2_min: 119, co2_max: 119, malus_eur: 75 },
  { co2_min: 120, co2_max: 120, malus_eur: 100 },
  { co2_min: 121, co2_max: 121, malus_eur: 125 },
  { co2_min: 122, co2_max: 122, malus_eur: 150 },
  { co2_min: 123, co2_max: 123, malus_eur: 170 },
  { co2_min: 124, co2_max: 124, malus_eur: 190 },
  { co2_min: 125, co2_max: 125, malus_eur: 210 },
  { co2_min: 126, co2_max: 126, malus_eur: 230 },
  { co2_min: 127, co2_max: 127, malus_eur: 240 },
  { co2_min: 128, co2_max: 128, malus_eur: 260 },
  { co2_min: 129, co2_max: 129, malus_eur: 280 },
  { co2_min: 130, co2_max: 130, malus_eur: 310 },
  { co2_min: 131, co2_max: 131, malus_eur: 330 },
  { co2_min: 132, co2_max: 132, malus_eur: 360 },
  { co2_min: 133, co2_max: 133, malus_eur: 400 },
  { co2_min: 134, co2_max: 134, malus_eur: 450 },
  { co2_min: 135, co2_max: 135, malus_eur: 540 },
  { co2_min: 136, co2_max: 136, malus_eur: 650 },
  { co2_min: 137, co2_max: 137, malus_eur: 740 },
  { co2_min: 138, co2_max: 138, malus_eur: 818 },
  { co2_min: 139, co2_max: 139, malus_eur: 898 },
  { co2_min: 140, co2_max: 140, malus_eur: 983 },
  { co2_min: 141, co2_max: 141, malus_eur: 1074 },
  { co2_min: 142, co2_max: 142, malus_eur: 1172 },
  { co2_min: 143, co2_max: 143, malus_eur: 1276 },
  { co2_min: 144, co2_max: 144, malus_eur: 1386 },
  { co2_min: 145, co2_max: 145, malus_eur: 1504 },
  { co2_min: 146, co2_max: 146, malus_eur: 1629 },
  { co2_min: 147, co2_max: 147, malus_eur: 1761 },
  { co2_min: 148, co2_max: 148, malus_eur: 1901 },
  { co2_min: 149, co2_max: 149, malus_eur: 2049 },
  { co2_min: 150, co2_max: 150, malus_eur: 2205 },
  { co2_min: 151, co2_max: 151, malus_eur: 2370 },
  { co2_min: 152, co2_max: 152, malus_eur: 2544 },
  { co2_min: 153, co2_max: 153, malus_eur: 2726 },
  { co2_min: 154, co2_max: 154, malus_eur: 2918 },
  { co2_min: 155, co2_max: 155, malus_eur: 3119 },
  { co2_min: 156, co2_max: 156, malus_eur: 3331 },
  { co2_min: 157, co2_max: 157, malus_eur: 3552 },
  { co2_min: 158, co2_max: 158, malus_eur: 3784 },
  { co2_min: 159, co2_max: 159, malus_eur: 4026 },
  { co2_min: 160, co2_max: 160, malus_eur: 4279 },
  { co2_min: 161, co2_max: 161, malus_eur: 4543 },
  { co2_min: 162, co2_max: 162, malus_eur: 4818 },
  { co2_min: 163, co2_max: 163, malus_eur: 5105 },
  { co2_min: 164, co2_max: 164, malus_eur: 5404 },
  { co2_min: 165, co2_max: 165, malus_eur: 5715 },
  { co2_min: 166, co2_max: 166, malus_eur: 6126 },
  { co2_min: 167, co2_max: 167, malus_eur: 6537 },
  { co2_min: 168, co2_max: 168, malus_eur: 7248 },
  { co2_min: 169, co2_max: 169, malus_eur: 7959 },
  { co2_min: 170, co2_max: 170, malus_eur: 8770 },
  { co2_min: 171, co2_max: 171, malus_eur: 9681 },
  { co2_min: 172, co2_max: 172, malus_eur: 10692 },
  { co2_min: 173, co2_max: 173, malus_eur: 11803 },
  { co2_min: 174, co2_max: 174, malus_eur: 13014 },
  { co2_min: 175, co2_max: 175, malus_eur: 14325 },
  { co2_min: 176, co2_max: 176, malus_eur: 15736 },
  { co2_min: 177, co2_max: 177, malus_eur: 17247 },
  { co2_min: 178, co2_max: 178, malus_eur: 18858 },
  { co2_min: 179, co2_max: 179, malus_eur: 20569 },
  { co2_min: 180, co2_max: 180, malus_eur: 22380 },
  { co2_min: 181, co2_max: 181, malus_eur: 24291 },
  { co2_min: 182, co2_max: 182, malus_eur: 26302 },
  { co2_min: 183, co2_max: 183, malus_eur: 28413 },
  { co2_min: 184, co2_max: 184, malus_eur: 30624 },
  { co2_min: 185, co2_max: 185, malus_eur: 32935 },
  { co2_min: 186, co2_max: 186, malus_eur: 35346 },
  { co2_min: 187, co2_max: 187, malus_eur: 37857 },
  { co2_min: 188, co2_max: 188, malus_eur: 40468 },
  { co2_min: 189, co2_max: 189, malus_eur: 43179 },
  { co2_min: 190, co2_max: 190, malus_eur: 45990 },
  { co2_min: 191, co2_max: 191, malus_eur: 48901 },
  { co2_min: 192, co2_max: 192, malus_eur: 51912 }
  // CO2 > 192: use maxCap (60000)
];

/**
 * Table 2025-B: Barème from March 1, 2025 to December 31, 2025
 * Source: Service Public France
 */
const TABLE_2025_B_BRACKETS = [
  { co2_min: 113, co2_max: 113, malus_eur: 50 },
  { co2_min: 114, co2_max: 114, malus_eur: 75 },
  { co2_min: 115, co2_max: 115, malus_eur: 100 },
  { co2_min: 116, co2_max: 116, malus_eur: 125 },
  { co2_min: 117, co2_max: 117, malus_eur: 150 },
  { co2_min: 118, co2_max: 118, malus_eur: 170 },
  { co2_min: 119, co2_max: 119, malus_eur: 190 },
  { co2_min: 120, co2_max: 120, malus_eur: 210 },
  { co2_min: 121, co2_max: 121, malus_eur: 230 },
  { co2_min: 122, co2_max: 122, malus_eur: 240 },
  { co2_min: 123, co2_max: 123, malus_eur: 260 },
  { co2_min: 124, co2_max: 124, malus_eur: 280 },
  { co2_min: 125, co2_max: 125, malus_eur: 310 },
  { co2_min: 126, co2_max: 126, malus_eur: 330 },
  { co2_min: 127, co2_max: 127, malus_eur: 360 },
  { co2_min: 128, co2_max: 128, malus_eur: 400 },
  { co2_min: 129, co2_max: 129, malus_eur: 450 },
  { co2_min: 130, co2_max: 130, malus_eur: 540 },
  { co2_min: 131, co2_max: 131, malus_eur: 650 },
  { co2_min: 132, co2_max: 132, malus_eur: 740 },
  { co2_min: 133, co2_max: 133, malus_eur: 818 },
  { co2_min: 134, co2_max: 134, malus_eur: 898 },
  { co2_min: 135, co2_max: 135, malus_eur: 983 },
  { co2_min: 136, co2_max: 136, malus_eur: 1074 },
  { co2_min: 137, co2_max: 137, malus_eur: 1172 },
  { co2_min: 138, co2_max: 138, malus_eur: 1276 },
  { co2_min: 139, co2_max: 139, malus_eur: 1386 },
  { co2_min: 140, co2_max: 140, malus_eur: 1504 },
  { co2_min: 141, co2_max: 141, malus_eur: 1629 },
  { co2_min: 142, co2_max: 142, malus_eur: 1761 },
  { co2_min: 143, co2_max: 143, malus_eur: 1901 },
  { co2_min: 144, co2_max: 144, malus_eur: 2049 },
  { co2_min: 145, co2_max: 145, malus_eur: 2205 },
  { co2_min: 146, co2_max: 146, malus_eur: 2370 },
  { co2_min: 147, co2_max: 147, malus_eur: 2544 },
  { co2_min: 148, co2_max: 148, malus_eur: 2726 },
  { co2_min: 149, co2_max: 149, malus_eur: 2918 },
  { co2_min: 150, co2_max: 150, malus_eur: 3119 },
  { co2_min: 151, co2_max: 151, malus_eur: 3331 },
  { co2_min: 152, co2_max: 152, malus_eur: 3552 },
  { co2_min: 153, co2_max: 153, malus_eur: 3784 },
  { co2_min: 154, co2_max: 154, malus_eur: 4026 },
  { co2_min: 155, co2_max: 155, malus_eur: 4279 },
  { co2_min: 156, co2_max: 156, malus_eur: 4543 },
  { co2_min: 157, co2_max: 157, malus_eur: 4818 },
  { co2_min: 158, co2_max: 158, malus_eur: 5105 },
  { co2_min: 159, co2_max: 159, malus_eur: 5404 },
  { co2_min: 160, co2_max: 160, malus_eur: 5715 },
  { co2_min: 161, co2_max: 161, malus_eur: 6126 },
  { co2_min: 162, co2_max: 162, malus_eur: 6537 },
  { co2_min: 163, co2_max: 163, malus_eur: 7248 },
  { co2_min: 164, co2_max: 164, malus_eur: 7959 },
  { co2_min: 165, co2_max: 165, malus_eur: 8770 },
  { co2_min: 166, co2_max: 166, malus_eur: 9681 },
  { co2_min: 167, co2_max: 167, malus_eur: 10692 },
  { co2_min: 168, co2_max: 168, malus_eur: 11803 },
  { co2_min: 169, co2_max: 169, malus_eur: 13014 },
  { co2_min: 170, co2_max: 170, malus_eur: 14325 },
  { co2_min: 171, co2_max: 171, malus_eur: 15736 },
  { co2_min: 172, co2_max: 172, malus_eur: 17247 },
  { co2_min: 173, co2_max: 173, malus_eur: 18858 },
  { co2_min: 174, co2_max: 174, malus_eur: 20569 },
  { co2_min: 175, co2_max: 175, malus_eur: 22380 },
  { co2_min: 176, co2_max: 176, malus_eur: 24291 },
  { co2_min: 177, co2_max: 177, malus_eur: 26302 },
  { co2_min: 178, co2_max: 178, malus_eur: 28413 },
  { co2_min: 179, co2_max: 179, malus_eur: 30624 },
  { co2_min: 180, co2_max: 180, malus_eur: 32935 },
  { co2_min: 181, co2_max: 181, malus_eur: 35346 },
  { co2_min: 182, co2_max: 182, malus_eur: 37857 },
  { co2_min: 183, co2_max: 183, malus_eur: 40468 },
  { co2_min: 184, co2_max: 184, malus_eur: 43179 },
  { co2_min: 185, co2_max: 185, malus_eur: 45990 },
  { co2_min: 186, co2_max: 186, malus_eur: 48901 },
  { co2_min: 187, co2_max: 187, malus_eur: 51912 },
  { co2_min: 188, co2_max: 188, malus_eur: 55023 },
  { co2_min: 189, co2_max: 189, malus_eur: 58134 },
  { co2_min: 190, co2_max: 190, malus_eur: 61245 },
  { co2_min: 191, co2_max: 191, malus_eur: 64356 },
  { co2_min: 192, co2_max: 192, malus_eur: 67467 }
  // CO2 > 192: use maxCap (70000)
];

/**
 * Get the table version to use based on registration date
 * @param {string} registrationDate - ISO date string (YYYY-MM-DD) for registration in France
 * @returns {Object} Table version object with id, name, startDate, endDate, threshold, maxCap
 */
export function getTableVersion(registrationDate) {
  if (!registrationDate) {
    // Default to most recent table if no date provided
    return TABLE_VERSIONS.TABLE_2025_B;
  }

  const regDate = new Date(registrationDate);
  const regDateStr = registrationDate;

  // Check each table version in order (most recent first)
  const versions = [
    TABLE_VERSIONS.TABLE_2025_B,
    TABLE_VERSIONS.TABLE_2024_A
  ];

  for (const version of versions) {
    if (regDateStr >= version.startDate && regDateStr <= version.endDate) {
      return version;
    }
  }

  // If date is before first table, use first table
  // If date is after last table, use last table
  if (regDateStr < TABLE_VERSIONS.TABLE_2024_A.startDate) {
    return TABLE_VERSIONS.TABLE_2024_A;
  }
  
  return TABLE_VERSIONS.TABLE_2025_B;
}

/**
 * Get the brackets array for a specific table version
 * @param {string} tableVersionId - Table version ID (e.g., '2024_A', '2025_B')
 * @returns {Array} Array of bracket objects
 */
function getBracketsForTable(tableVersionId) {
  switch (tableVersionId) {
    case '2024_A':
      return TABLE_2024_A_BRACKETS;
    case '2025_B':
      return TABLE_2025_B_BRACKETS;
    default:
      throw new Error(`Unknown table version: ${tableVersionId}`);
  }
}

/**
 * Get base malus amount for a given CO2 level using the specified table
 * Returns exact bracket amount (no interpolation)
 * 
 * @param {string} tableVersionId - Table version ID
 * @param {number} co2_g_km - CO2 emissions in g/km (WLTP)
 * @returns {number} Base malus amount in EUR (0 if below threshold, maxCap if above max bracket)
 */
export function getBaseMalus(tableVersionId, co2_g_km) {
  if (co2_g_km === null || co2_g_km === undefined || isNaN(co2_g_km)) {
    return 0;
  }

  const tableVersion = Object.values(TABLE_VERSIONS).find(v => v.id === tableVersionId);
  if (!tableVersion) {
    throw new Error(`Invalid table version: ${tableVersionId}`);
  }

  // Below threshold: malus = 0
  if (co2_g_km < tableVersion.threshold) {
    return 0;
  }

  const brackets = getBracketsForTable(tableVersionId);

  // Find exact bracket match
  for (const bracket of brackets) {
    if (co2_g_km >= bracket.co2_min && co2_g_km <= bracket.co2_max) {
      return bracket.malus_eur;
    }
  }

  // Above max bracket: return maxCap
  return tableVersion.maxCap;
}
