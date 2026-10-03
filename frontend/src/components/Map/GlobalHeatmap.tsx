'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

export default function GlobalHeatmap({ orgs }: { orgs: any[] }) {
  const defaultCenter: [number, number] = [28.6139, 77.2090]; // New Delhi

  if (!orgs || orgs.length === 0) {
    return (
      <div className="h-96 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300">
        <p className="text-slate-500 font-medium">No organizations to display on map</p>
      </div>
    );
  }

  // Generate some deterministic mock coords based on org ID for visual effect
  // In a real app, orgs would have lat/lng
  const getMockCoords = (id: string, idx: number): [number, number] => {
    const lat = 28.5 + (idx % 10) * 0.02;
    const lng = 77.1 + (idx % 8) * 0.03;
    return [lat, lng];
  }

  const [pulseRadius, setPulseRadius] = useState(0);

  useEffect(() => {
    let growing = true;
    const interval = setInterval(() => {
      setPulseRadius(prev => {
        if (prev >= 6) growing = false;
        if (prev <= 0) growing = true;
        return prev + (growing ? 0.5 : -0.5);
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-[400px] w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 relative z-0">
      <MapContainer center={defaultCenter} zoom={11} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {orgs.map((org, idx) => {
          const isKitchen = org.type === 'KITCHEN';
          const coords = getMockCoords(org.id, idx);
          return (
            <CircleMarker 
              key={org.id} 
              center={coords} 
              pathOptions={{ 
                color: isKitchen ? '#f97316' : '#8b5cf6', 
                fillColor: isKitchen ? '#fdba74' : '#c4b5fd', 
                fillOpacity: 0.7 
              }} 
              radius={(isKitchen ? 12 : 8) + pulseRadius}
            >
              <Popup>
                <strong>{org.name}</strong><br/>
                Type: {org.type}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
