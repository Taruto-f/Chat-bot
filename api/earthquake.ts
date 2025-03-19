import axios from 'axios';

interface EarthquakeData {
  id: string;
  time: string;
  magnitude: number;
  location: string;
  depth: number | null;
  intensity: string;
  latitude: number;
  longitude: number;
}

export async function getEarthquakeInfo(): Promise<EarthquakeData[]> {
  try {
    const response = await axios.get('https://api.p2pquake.net/v2/history', {
      params: {
        limit: 10,
        orderby: 'time',
        order: 'desc',
        type: 'earthquake'
      }
    });

    return response.data.map((quake: any) => ({
      id: quake.id,
      time: quake.time,
      magnitude: quake.magnitude,
      location: quake.place,
      depth: quake.depth || null,
      intensity: quake.intensity,
      latitude: quake.latitude,
      longitude: quake.longitude
    }));
  } catch (error) {
    console.error('地震情報の取得に失敗しました:', error);
    throw new Error('地震情報の取得に失敗しました');
  }
} 