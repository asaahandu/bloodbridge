import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { DonationCentreMapProps } from './DonationCentreMap.types';

export function DonationCentreMap({
  donorCoordinates,
  donorName,
  hospitalCoordinates,
  hospitalName,
}: DonationCentreMapProps) {
  const mapRef = useRef<MapView>(null);
  const coordinates = useMemo(
    () => [donorCoordinates, hospitalCoordinates].map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
    [donorCoordinates, hospitalCoordinates],
  );
  const region = useMemo(() => {
    const latitude = (donorCoordinates[1] + hospitalCoordinates[1]) / 2;
    const longitude = (donorCoordinates[0] + hospitalCoordinates[0]) / 2;
    return {
      latitude,
      longitude,
      latitudeDelta: Math.max(0.01, Math.abs(donorCoordinates[1] - hospitalCoordinates[1]) * 2),
      longitudeDelta: Math.max(0.01, Math.abs(donorCoordinates[0] - hospitalCoordinates[0]) * 2),
    };
  }, [donorCoordinates, hospitalCoordinates]);

  useEffect(() => {
    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: true,
    });
  }, [coordinates]);

  return (
    <View style={styles.container}>
      <MapView initialRegion={region} ref={mapRef} style={StyleSheet.absoluteFill}>
        <Marker
          coordinate={coordinates[0]}
          pinColor="#121212"
          title="Your location"
          description={donorName}
        />
        <Marker
          coordinate={coordinates[1]}
          pinColor="#8E1722"
          title={hospitalName}
          description="Donation centre"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 290,
    overflow: 'hidden',
    width: '100%',
  },
});
