'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function RouteMap({ tasks }: { tasks: any[] }) {
  const defaultCenter: [number, number] = [28.6139, 77.2090]; // New Delhi coordinates as default

  if (!tasks || tasks.length === 0) {
    return (
      <div className="h-64 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300">
        <p className="text-slate-500 font-medium">No active routes to display</p>
      </div>
    );
  }

  // Active task's route (just taking the first IN_TRANSIT or PENDING task for the map)
  const activeTask = tasks.find(t => t.status === 'IN_TRANSIT') || tasks[0];

  const pickupCoords: [number, number] = [28.6139, 77.2090];
  const dropoffCoords: [number, number] = [28.5355, 77.2410]; // Some other point in Delhi

  // Create a custom driver icon
  const driverIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/732/732204.png',
    iconSize: [32, 32],
    className: 'animate-pulse drop-shadow-xl'
  });

  const [currentPos, setCurrentPos] = useState<[number, number]>(pickupCoords);

  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.01;
      if (progress > 1) progress = 0; // Loop for demo purposes
      
      const lat = pickupCoords[0] + (dropoffCoords[0] - pickupCoords[0]) * progress;
      const lng = pickupCoords[1] + (dropoffCoords[1] - pickupCoords[1]) * progress;
      
      setCurrentPos([lat, lng]);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-96 w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 relative z-0">
      <MapContainer center={pickupCoords} zoom={12} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={pickupCoords}>
          <Popup>Pickup: {activeTask.surplus.kitchen.name}</Popup>
        </Marker>
        <Marker position={dropoffCoords}>
          <Popup>Dropoff: {activeTask.ngo.name}</Popup>
        </Marker>
        <Marker position={currentPos} icon={driverIcon} zIndexOffset={1000}>
          <Popup>Driver In Transit</Popup>
        </Marker>
        <Polyline positions={[pickupCoords, dropoffCoords]} color="#3b82f6" weight={5} dashArray="10, 15" className="animate-[dash_20s_linear_infinite]" />
        <style>{`
          @keyframes dash {
            to { stroke-dashoffset: -1000; }
          }
        `}</style>
      </MapContainer>
    </div>
  );
}
