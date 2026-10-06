/**
 * Teléfonos móviles argentinos.
 *
 * La gente escribe su celular de mil formas: "11 5523-8841", "011 15 5523 8841",
 * "+54 9 11 5523 8841". Aceptamos todas y guardamos un único formato E.164
 * (`+549` + código de área sin 0 + número sin 15), que es el que usan WhatsApp
 * y los proveedores de SMS.
 */

/** E.164 de un celular argentino, ej. `+5491155238841`. */
export type ArMobile = string;

export function normalizeArMobile(input: string): ArMobile | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("549")) digits = digits.slice(3);
  else if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);

  // "11 15 5523-8841" → quitar el 15 que va después del código de área (2 a 4 dígitos).
  if (digits.length === 12) {
    for (const areaLen of [2, 3, 4]) {
      if (digits.slice(areaLen, areaLen + 2) === "15") {
        digits = digits.slice(0, areaLen) + digits.slice(areaLen + 2);
        break;
      }
    }
  }

  return /^[1-9]\d{9}$/.test(digits) ? `+549${digits}` : null;
}

/**
 * `+5491155238841` → `+54 9 11 5523-8841`. Solo para mostrar: AMBA usa área de
 * 2 dígitos; para el interior se asumen 3 (cubre la mayoría de las ciudades).
 */
export function formatArMobile(phone: ArMobile): string {
  const n = phone.replace(/^\+549/, "");
  const areaLen = n.startsWith("11") ? 2 : 3;
  const area = n.slice(0, areaLen);
  const rest = n.slice(areaLen);
  return `+54 9 ${area} ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
}

/** Muestra solo los últimos dígitos: "•••• 8841". Para pantallas compartidas. */
export function maskArMobile(phone: ArMobile): string {
  return `•••• ${phone.slice(-4)}`;
}
