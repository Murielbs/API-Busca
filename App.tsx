import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Button,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  Image,
} from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [placeLoc, setPlaceLoc] = useState<{ lat: number; lon: number; name?: string } | null>(null);
  const [wiki, setWiki] = useState<{ title?: string; extract?: string; thumbnail?: string } | null>(null);

  function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Number(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
  }

  async function getUserLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permissão de localização negada');
    const pos = await Location.getCurrentPositionAsync({});
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }

  async function getPlaceCoords(q: string) {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
    const d = await r.json();
    return d[0] ? { lat: +d[0].lat, lon: +d[0].lon, name: d[0].display_name } : null;
  }

  async function getWikiInfo(q: string) {
    try {
      const r = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
      if (!r.ok) return null;
      const d = await r.json();
      return { title: d.title, extract: d.extract, thumbnail: d.thumbnail && d.thumbnail.source };
    } catch (err) {
      return null;
    }
  }

  async function handleSearch() {
    if (!query.trim()) return Alert.alert('Digite um local!');
    setLoading(true);
    setResult(null);
    setWiki(null);
    setPlaceLoc(null);
    try {
      const user = await getUserLocation();
      setUserLoc(user);

      const place = await getPlaceCoords(query.trim());
      if (!place) {
        setResult('Local não encontrado.');
        return;
      }
      setPlaceLoc(place);

      const dist = calcularDistancia(user.latitude, user.longitude, place.lat, place.lon);

      const wikiData = await getWikiInfo(query.trim());
      setWiki(wikiData);

      const mapsUrl = `https://www.google.com/maps/dir/${user.latitude},${user.longitude}/${place.lat},${place.lon}`;

      let out = `Sua localização: ${user.latitude.toFixed(6)}, ${user.longitude.toFixed(6)}\n`;
      out += `Local pesquisado: ${place.lat.toFixed(6)}, ${place.lon.toFixed(6)}\n`;
      out += `Distância: ${dist} km\n\n`;
      out += `Ver rota: ${mapsUrl}`;

      setResult(out);
    } catch (e: any) {
      setResult('Erro: ' + (e && e.message ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>ExploraBR</Text>

        <Text style={styles.subtitle}>Digite um local para buscar</Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: Rio de Janeiro, .."
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />

        <View style={styles.buttonWrap}>
          <Button title="Pesquisar" onPress={handleSearch} />
        </View>

        {loading && <ActivityIndicator style={{ marginTop: 12 }} />}

        {result && (
          <ScrollView style={styles.resultContainer}>
            <Text selectable>{result}</Text>

            {placeLoc && userLoc && (
              <View style={{ marginTop: 8 }}>
                <Button
                  title="Ver rota no Google Maps"
                  onPress={() => Linking.openURL(`https://www.google.com/maps/dir/${userLoc.latitude},${userLoc.longitude}/${placeLoc.lat},${placeLoc.lon}`)}
                />
              </View>
            )}

            {wiki && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: '700', fontSize: 18 }}>{wiki.title}</Text>
                {wiki.thumbnail && <Image source={{ uri: wiki.thumbnail }} style={{ width: 200, height: 120, marginTop: 8 }} />}
                <Text style={{ marginTop: 8 }}>{wiki.extract}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    color: '#222',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    width: '100%',
    height: 44,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  buttonWrap: {
    width: '100%',
    marginBottom: 12,
    
  },
  resultContainer: {
    marginTop: 16,
    width: '100%',
    maxHeight: '60%',
    borderColor: '#eee',
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
});
