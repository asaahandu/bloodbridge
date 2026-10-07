import { Text, View } from 'react-native';

import type { DonorSearchMapProps } from './DonorSearchMap.types';

const EDGE_PADDING_PERCENT = 12;

function getMarkerPosition(
  coordinates: [number, number],
  hospitalCoordinates: [number, number],
  radiusKm: number,
) {
  const [longitude, latitude] = coordinates;
  const [hospitalLongitude, hospitalLatitude] = hospitalCoordinates;
  const latitudeRadius = Math.max(0.00001, radiusKm / 111);
  const longitudeRadius =
    latitudeRadius / Math.max(0.2, Math.cos((hospitalLatitude * Math.PI) / 180));
  const usableRadius = 50 - EDGE_PADDING_PERCENT;
  const longitudeOffset = Math.max(
    -1,
    Math.min(1, (longitude - hospitalLongitude) / longitudeRadius),
  );
  const latitudeOffset = Math.max(
    -1,
    Math.min(1, (latitude - hospitalLatitude) / latitudeRadius),
  );

  return {
    left: `${50 + longitudeOffset * usableRadius}%` as const,
    top: `${50 - latitudeOffset * usableRadius}%` as const,
  };
}

function formatViewRadius(radiusKm: number) {
  return radiusKm < 1 ? `${Math.round(radiusKm * 1000)} M` : `${radiusKm.toFixed(2)} KM`;
}

export function DonorSearchMap({
  donors,
  hospitalCoordinates,
  hospitalName,
  showRadius,
  viewRadiusKm,
}: DonorSearchMapProps) {
  return (
    <View className="relative h-[300px] w-full overflow-hidden bg-[#E9ECE8]">
      <View className="absolute -left-10 top-12 h-5 w-[130%] rotate-[11deg] bg-white opacity-80" />
      <View className="absolute -left-6 top-[190px] h-4 w-[125%] -rotate-[8deg] bg-white opacity-80" />
      <View className="absolute left-[42%] -top-10 h-[130%] w-4 rotate-[5deg] bg-white opacity-70" />
      {showRadius ? (
        <View
          className="absolute h-[250px] w-[250px] rounded-full border border-blood-red bg-blood-red-soft opacity-20"
          style={{ left: '50%', marginLeft: -125, marginTop: -125, top: '50%' }}
        />
      ) : null}

      <View className="absolute left-3 top-3 rounded-lg bg-white/90 px-2.5 py-2">
        <Text className="text-[9px] font-extrabold text-ink">
          GPS VIEW · {formatViewRadius(viewRadiusKm)}
        </Text>
      </View>

      <View
        className="absolute -ml-3 -mt-3 h-7 w-7 items-center justify-center rounded-full border-4 border-white bg-blood-red"
        style={getMarkerPosition(hospitalCoordinates, hospitalCoordinates, viewRadiusKm)}>
        <Text className="text-[9px] font-black text-white">H</Text>
      </View>

      {donors.map((donor, index) => (
        <View
          className="absolute -ml-2.5 -mt-2.5 h-6 w-6 items-center justify-center rounded-full border-[3px] border-white bg-ink"
          key={donor.id}
          style={getMarkerPosition(donor.coordinates, hospitalCoordinates, viewRadiusKm)}>
          <Text className="text-[8px] font-black text-white">{donor.rank || index + 1}</Text>
        </View>
      ))}

      <View className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/95 px-3 py-2">
        <Text className="text-[9px] font-bold text-ink" numberOfLines={1}>
          {hospitalName} · native street map available on Android and iOS
        </Text>
      </View>
    </View>
  );
}
