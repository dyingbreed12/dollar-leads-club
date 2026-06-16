/**
 * Google Maps URL generators for displaying map images
 */

export function getGoogleStreetViewUrl(address: string, apiKey: string): string {
  const size = "600x400";
  const fov = "90";
  const pitch = "10";

  const encodedAddress = encodeURIComponent(address);

  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${encodedAddress}&fov=${fov}&pitch=${pitch}&key=${apiKey}`;
}

export function getGoogleStaticMapUrl(address: string, apiKey: string): string {
  const size = "600x400";
  const zoom = "17";
  const maptype = "roadmap";

  const encodedAddress = encodeURIComponent(address);

  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=${zoom}&size=${size}&maptype=${maptype}&markers=color:red%7C${encodedAddress}&key=${apiKey}`;
}
