"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, Marker, StreetViewPanorama, useJsApiLoader } from "@react-google-maps/api";

interface PropertyMapProps {
  address: string;
  apiKey: string;
  showPin?: boolean;
}

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const mapContainerStyle = {
  width: "100%",
  height: "280px",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

export function PropertyMap({ address, apiKey, showPin = true }: PropertyMapProps) {
  const [viewMode, setViewMode] = useState<"map" | "streetview">("map");
  const [center, setCenter] = useState<google.maps.LatLngLiteral | null>(null);
  const [geocodeError, setGeocodeError] = useState(false);
  const [streetViewAvailable, setStreetViewAvailable] = useState(true);
  const [checkingStreetView, setCheckingStreetView] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: LIBRARIES,
  });

  // Geocode the address
  const geocodeAddress = useCallback(() => {
    if (!isLoaded || !window.google || !address) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        setCenter({
          lat: location.lat(),
          lng: location.lng(),
        });
        setGeocodeError(false);
      } else {
        console.error("Geocoding failed:", status);
        setGeocodeError(true);
      }
    });
  }, [isLoaded, address]);

  // Geocode when map loads
  useEffect(() => {
    if (isLoaded) {
      geocodeAddress();
    }
  }, [isLoaded, geocodeAddress]);

  // Check Street View availability when center is set
  useEffect(() => {
    if (!isLoaded || !center || !window.google) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckingStreetView(true);
    const streetViewService = new window.google.maps.StreetViewService();

    streetViewService.getPanorama(
      { location: center, radius: 50 },
      (data, status) => {
        setStreetViewAvailable(status === "OK");
        setCheckingStreetView(false);
      }
    );
  }, [isLoaded, center]);

  // Street View options
  const streetViewOptions = useMemo(() => {
    if (!center) return {};
    return {
      position: center,
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      visible: true,
      disableDefaultUI: true,
      zoomControl: true,
      addressControl: true,
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
      fullscreenControl: true,
    };
  }, [center]);

  if (loadError) {
    return (
      <div className="w-full rounded-lg overflow-hidden shadow">
        <div className="flex items-center justify-center h-[280px] bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Error loading maps</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full rounded-lg overflow-hidden shadow">
        <div className="flex items-center justify-center h-[280px] bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full rounded-lg overflow-hidden shadow">
        <div className="flex items-center justify-center h-[280px] bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Maps API key not configured</p>
        </div>
      </div>
    );
  }

  if (geocodeError || !center) {
    return (
      <div className="w-full rounded-lg overflow-hidden shadow">
        <div className="flex flex-col items-center justify-center h-[280px] bg-gray-100 dark:bg-gray-800 rounded-lg gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-400"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <p className="text-gray-500 dark:text-gray-400">
            {geocodeError ? "Location unavailable" : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden shadow">
      {/* Toggle Buttons */}
      <div className="flex w-full border-b border-gray-200 dark:border-gray-700 z-10 relative">
        <button
          onClick={() => setViewMode("map")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === "map"
              ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-b-2 border-blue-500"
              : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          Map
        </button>
        <button
          onClick={() => streetViewAvailable && setViewMode("streetview")}
          disabled={!streetViewAvailable || checkingStreetView}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === "streetview"
              ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-b-2 border-blue-500"
              : !streetViewAvailable || checkingStreetView
              ? "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
              : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          title={
            checkingStreetView
              ? "Checking Street View availability..."
              : !streetViewAvailable
              ? "Street View not available for this location"
              : "View in Street View"
          }
        >
          Street
          {checkingStreetView && " ..."}
        </button>
      </div>

     <div className="relative z-0 h-[200px] w-full overflow-hidden">
       {/* Map Container */}
        {viewMode === "map" ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={15}
            options={mapOptions}
          >
            {showPin && <Marker position={center} />}
          </GoogleMap>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={15}
            options={mapOptions}
          >
            <StreetViewPanorama options={streetViewOptions} />
          </GoogleMap>
        )}
      </div>
    </div>
  );
}
