import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import type { DonorSearchMapProps } from './DonorSearchMap.types';

function getRegion(
  hospitalCoordinates: [number, number],
  viewRadiusKm: number,
) {
  const [longitude, latitude] = hospitalCoordinates;
  const latitudeRadiusDelta = (viewRadiusKm / 111) * 2.4;
  const longitudeRadiusDelta =
    latitudeRadiusDelta / Math.max(0.2, Math.cos((latitude * Math.PI) / 180));

  return {
    latitude,
    longitude,
    latitudeDelta: Math.max(0.0005, latitudeRadiusDelta),
    longitudeDelta: Math.max(0.0005, longitudeRadiusDelta),
  };
}

export function DonorSearchMap(props: DonorSearchMapProps) {
  const { donors, hospitalCoordinates, hospitalName, radiusKm, showRadius, viewRadiusKm } = props;
  const [hospitalLongitude, hospitalLatitude] = hospitalCoordinates;
  const mapRef = useRef<MapView>(null);
  const region = useMemo(
    () => getRegion(hospitalCoordinates, viewRadiusKm),
    [hospitalCoordinates, viewRadiusKm],
  );

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 1200);
  }, [region]);

  return (
    <View style={styles.container}>
      <MapView
        initialRegion={region}
        mapPadding={{ bottom: 18, left: 18, right: 18, top: 18 }}
        pitchEnabled={false}
        ref={mapRef}
        rotateEnabled={false}
        style={StyleSheet.absoluteFill}>
        {showRadius ? (
          <Circle
            center={{ latitude: hospitalLatitude, longitude: hospitalLongitude }}
            fillColor="rgba(142, 23, 34, 0.035)"
            radius={radiusKm * 1000}
            strokeColor="rgba(142, 23, 34, 0.38)"
            strokeWidth={1}
          />
        ) : null}
        <Marker
          coordinate={{ latitude: hospitalLatitude, longitude: hospitalLongitude }}
          description={`${hospitalLatitude.toFixed(5)}, ${hospitalLongitude.toFixed(5)}`}
          pinColor="#8E1722"
          title={hospitalName}
        />
        {donors.map((donor, index) => {
          const [longitude, latitude] = donor.coordinates;

          return (
            <Marker
              coordinate={{ latitude, longitude }}
              description={`${donor.matchPercentage}% match · ${donor.distanceKm.toFixed(1)} km · about ${donor.estimatedTravelMinutes} min`}
              key={donor.id}
              pinColor="#121212"
              title={`Ranked donor ${donor.rank || index + 1} · ${donor.bloodType}`}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    overflow: 'hidden',
    width: '100%',
  },
});
