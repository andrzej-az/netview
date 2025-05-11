
/**
 * Validates if a string is a valid IPv4 address.
 * @param ip The string to validate.
 * @returns True if the string is a valid IPv4 address, false otherwise.
 */
export function isValidIp(ip: string): boolean {
  if (typeof ip !== 'string') {
    return false;
  }
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return false;
  }
  return parts.every(isValidOctet);
}

/**
 * Validates if a string is a valid IPv4 octet (0-255).
 * @param octet The string to validate.
 * @returns True if the string is a valid octet, false otherwise.
 */
export function isValidOctet(octet: string): boolean {
  if (!/^\d{1,3}$/.test(octet)) {
    return false; // Not 1-3 digits
  }
  const num = parseInt(octet, 10);
  return num >= 0 && num <= 255;
}

/**
 * Converts an IPv4 address string to its numerical representation.
 * @param ip The IPv4 string.
 * @returns The numerical representation, or null if the IP is invalid.
 */
export function ipToNumber(ip: string): number | null {
  if (!isValidIp(ip)) {
    return null;
  }
  const parts = ip.split('.').map(Number);
  // This check is redundant due to isValidIp but good for safety
  if (parts.some(isNaN) || parts.length !== 4) {
    return null;
  }
  return (parts[0] * Math.pow(256, 3)) + (parts[1] * Math.pow(256, 2)) + (parts[2] * 256) + parts[3];
}
