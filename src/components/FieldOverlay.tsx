import { useState } from 'react';

interface FieldOverlayProps {
  onImageSelect: (imageUrl: string | null) => void;
}

// Preset field overlays for FTC game seasons
const FIELD_PRESETS = [
  {
    id: 'test-color',
    name: 'Test Color Overlay (Red)',
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmYwMDAwIiBvcGFjaXR5PSIwLjgiLz48L3N2Zz4=',
  },
  {
    id: 'test-grid',
    name: 'Test Grid Overlay',
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8cGF0aCBkPSJNIDMwIDAgTCAwIDAgMCAzMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMwMDAwMDAiIG9wYWNpdHk9IjAuNCIvPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz4KPC9zdmc+',
  },
  {
    id: 'centerstage',
    name: '2023-24 Centerstage',
    url: 'https://i.imgur.com/placeholder.png', // Placeholder - replace with actual image
  },
  {
    id: 'intothedeep',
    name: '2024-25 Into the Deep',
    url: 'https://i.imgur.com/placeholder.png', // Placeholder - replace with actual image
  },
  {
    id: 'freight-frenzy',
    name: '2021-22 Freight Frenzy',
    url: 'https://i.imgur.com/placeholder.png', // Placeholder - replace with actual image
  },
  {
    id: 'powerplay',
    name: '2022-23 Power Play',
    url: 'https://i.imgur.com/placeholder.png', // Placeholder - replace with actual image
  },
];

export const FieldOverlay = ({ onImageSelect }: FieldOverlayProps) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPreset(presetId);

    if (presetId === '') {
      onImageSelect(null);
    } else {
      const preset = FIELD_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        console.log('Loading overlay:', preset.name, preset.url);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          console.log('Overlay loaded successfully:', preset.name);
          onImageSelect(preset.url);
        };
        img.onerror = () => {
          console.error('Failed to load overlay:', preset.name, preset.url);
          // Still call onImageSelect with the URL to show the error state
          onImageSelect(preset.url);
        };
        img.src = preset.url;
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedPreset}
        onChange={handlePresetChange}
        className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 font-mono text-white focus:border-blue-500 outline-none cursor-pointer"
      >
        <option value="">No overlay</option>
        {FIELD_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
    </div>
  );
};
