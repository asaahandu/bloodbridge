import { Text, View } from 'react-native';

import type { DonationCentreMapProps } from './DonationCentreMap.types';

function getPinPosition(
  coordinates: [number, number],
  donorCoordinates: [number, number],
  hospitalCoordinates: [number, number],
) {
  const longitudeSpan = Math.max(
    Math.abs(donorCoordinates[0] - hospitalCoordinates[0]),
    0.002,
  );
  const latitudeSpan = Math.max(
    Math.abs(donorCoordinates[1] - hospitalCoordinates[1]),
    0.002,
  );
  const longitudeCenter = (donorCoordinates[0] + hospitalCoordinates[0]) / 2;
  const latitudeCenter = (donorCoordinates[1] + hospitalCoordinates[1]) / 2;

  return {
    left: `${Math.max(12, Math.min(88, 50 + ((coordinates[0] - longitudeCenter) / longitudeSpan) * 48))}%` as const,
    top: `${Math.max(18, Math.min(82, 50 - ((coordinates[1] - latitudeCenter) / latitudeSpan) * 40))}%` as const,
  };
}

export function DonationCentreMap({
  donorCoordinates,
  donorName,
  hospitalCoordinates,
  hospitalName,
}: DonationCentreMapProps) {
  return (
    <View className="relative h-[290px] w-full overflow-hidden rounded-[19px] bg-[#E9ECE8]">
      <View className="absolute -left-10 top-12 h-5 w-[130%] rotate-[11deg] bg-white opacity-80" />
      <View className="absolute -left-6 top-[190px] h-4 w-[125%] -rotate-[8deg] bg-white opacity-80" />
      <View className="absolute left-[42%] -top-10 h-[130%] w-4 rotate-[5deg] bg-white opacity-70" />
      <View className="absolute left-[72%] -top-10 h-[130%] w-3 -rotate-[12deg] bg-white opacity-65" />

      <View
        className="absolute -ml-4 -mt-4 h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-ink shadow-lg"
        style={getPinPosition(donorCoordinates, donorCoordinates, hospitalCoordinates)}>
        <Text className="text-[9px] font-black text-white">D</Text>
      </View>
      <View
        className="absolute -ml-4 -mt-4 h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blood-red shadow-lg"
        style={getPinPosition(hospitalCoordinates, donorCoordinates, hospitalCoordinates)}>
        <Text className="text-[9px] font-black text-white">H</Text>
      </View>

      <View className="absolute bottom-3 left-3 right-3 flex-row justify-between gap-2">
        <View className="max-w-[48%] rounded-xl bg-white/95 px-3 py-2">
          <Text className="text-[9px] font-extrabold text-ink" numberOfLines={1}>
            D · {donorName}
          </Text>
        </View>
        <View className="max-w-[48%] rounded-xl bg-white/95 px-3 py-2">
          <Text className="text-[9px] font-extrabold text-blood-red" numberOfLines={1}>
            H · {hospitalName}
          </Text>
        </View>
      </View>
    </View>
  );
}
