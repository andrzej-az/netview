
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
