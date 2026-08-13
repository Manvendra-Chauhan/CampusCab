import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const Map = ({ pickupCoords, destinationCoords, driverCoords, status }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);

  useEffect(() => {
    // 1. Initialize map if it doesn't exist
    if (!mapInstanceRef.current && mapContainerRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([30.3564, 76.3647], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // 2. Define custom DIV icons to avoid asset path issues
    const pickupIcon = L.divIcon({
      html: '<div class="d-flex align-items-center justify-content-center bg-success text-white rounded-circle shadow" style="width: 32px; height: 32px; border: 2px solid white;"><i class="bi bi-geo-alt-fill" style="font-size: 14px;"></i></div>',
      className: 'custom-leaflet-icon-pickup',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const destIcon = L.divIcon({
      html: '<div class="d-flex align-items-center justify-content-center bg-danger text-white rounded-circle shadow" style="width: 32px; height: 32px; border: 2px solid white;"><i class="bi bi-flag-fill" style="font-size: 14px;"></i></div>',
      className: 'custom-leaflet-icon-dest',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const driverIcon = L.divIcon({
      html: '<div class="d-flex align-items-center justify-content-center bg-warning text-dark rounded-circle shadow-lg border border-white" style="width: 36px; height: 36px; box-shadow: 0 0 12px rgba(245, 158, 11, 0.7); animation: bounce 1.5s infinite alternate;"><i class="bi bi-car-front-fill" style="font-size: 16px;"></i></div>',
      className: 'custom-leaflet-icon-driver',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const bounds = [];

    // 3. Render pickup marker
    if (pickupCoords && Array.isArray(pickupCoords) && pickupCoords.length === 2) {
      if (markersRef.current.pickup) {
        markersRef.current.pickup.setLatLng(pickupCoords);
      } else {
        markersRef.current.pickup = L.marker(pickupCoords, { icon: pickupIcon })
          .addTo(map)
          .bindPopup('<b>Pickup Point</b>');
      }
      bounds.push(pickupCoords);
    } else {
      if (markersRef.current.pickup) {
        map.removeLayer(markersRef.current.pickup);
        delete markersRef.current.pickup;
      }
    }

    // 4. Render destination marker
    if (destinationCoords && Array.isArray(destinationCoords) && destinationCoords.length === 2) {
      if (markersRef.current.destination) {
        markersRef.current.destination.setLatLng(destinationCoords);
      } else {
        markersRef.current.destination = L.marker(destinationCoords, { icon: destIcon })
          .addTo(map)
          .bindPopup('<b>Destination Point</b>');
      }
      bounds.push(destinationCoords);
    } else {
      if (markersRef.current.destination) {
        map.removeLayer(markersRef.current.destination);
        delete markersRef.current.destination;
      }
    }

    // 5. Render driver marker
    if (driverCoords && Array.isArray(driverCoords) && driverCoords.length === 2) {
      if (markersRef.current.driver) {
        markersRef.current.driver.setLatLng(driverCoords);
      } else {
        markersRef.current.driver = L.marker(driverCoords, { icon: driverIcon })
          .addTo(map)
          .bindPopup('<b>Driver</b>');
      }
      bounds.push(driverCoords);
    } else {
      if (markersRef.current.driver) {
        map.removeLayer(markersRef.current.driver);
        delete markersRef.current.driver;
      }
    }

    // 6. Draw route polyline between pickup and destination
    if (pickupCoords && destinationCoords) {
      const lineCoords = [pickupCoords, destinationCoords];
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(lineCoords);
      } else {
        polylineRef.current = L.polyline(lineCoords, {
          color: 'var(--primary)',
          weight: 4,
          opacity: 0.8,
          dashArray: '5, 10'
        }).addTo(map);
      }
    } else {
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }
    }

    // 7. Auto-fit bounds
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }

    // Cleanup logic on unmount
    return () => {
      // Keep map reference open for duration of component lifecycle
    };
  }, [pickupCoords, destinationCoords, driverCoords, status]);

  // Handle map container resizing
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="position-relative">
      <div ref={mapContainerRef} className="leaflet-map-container" />
      <style>{`
        @keyframes bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default Map;
