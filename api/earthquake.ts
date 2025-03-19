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
      magnitude: quake.magnitude || 0,
      location: quake.place || '不明',
      depth: quake.depth === undefined ? null : Number(quake.depth),
      intensity: quake.intensity || '不明',
      latitude: quake.latitude || 0,
      longitude: quake.longitude || 0
    }));
  } catch (error) {
    console.error('地震情報の取得に失敗しました:', error);
    throw new Error('地震情報の取得に失敗しました');
  }
} 