import { useState } from 'react';

// 1. Import local images from your project folder
import decodeImg from '../fields/decode.png';
import intoTheDeepImg from '../fields/into_the_deep.png';


interface FieldOverlayProps {
  onImageSelect: (imageUrl: string | null) => void;
}

// 2. Use the imported variables in your presets
const FIELD_PRESETS = [
  {
    id: 'decode',
    name: '2025-26 Decode',
    url: decodeImg,
  },
  {
    id: 'into_the_deep',
    name: '2024-25 Into the Deep',
    url: intoTheDeepImg,
  },
];

export const FieldOverlay = ({ onImageSelect }: FieldOverlayProps) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('decode');

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPreset(presetId);

    if (presetId === '') {
      onImageSelect(null);
      return;
    }

      const preset = FIELD_PRESETS.find((p) => p.id === presetId);
      if (preset) {
      // Since these are local imports, they are bundled with the app.
      // We don't need the complex 'new Image()' loader unless you 
      // specifically need to wait for high-res decoding.
          onImageSelect(preset.url);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] uppercase font-bold text-gray-500">Field</label>
      <select
        value={selectedPreset}
        onChange={handlePresetChange}
        className="text-xs bg-gray-900 border border-gray-700 rounded px-2 py-1 font-mono text-white focus:border-blue-500 outline-none cursor-pointer hover:bg-gray-800 transition-colors"
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