import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

interface EarthquakeData {
  id: string;
  time: string;
  magnitude: number;
  location: string;
  depth: number | null;
  intensity: string;
  latitude: number;
  longitude: number;
  tsunami: string;
}

export async function getEarthquakeInfo(): Promise<EarthquakeData[]> {
  try {
    const response = await axios.get('https://www.jma.go.jp/bosai/quake/data/quake.xml', {
      responseType: 'text'
    });

    const parser = new XMLParser();
    const result = parser.parse(response.data);

    // XMLデータから地震情報を抽出
    const earthquakes = result.Report.Body.Earthquake || [];
    const earthquakeList = Array.isArray(earthquakes) ? earthquakes : [earthquakes];

    return earthquakeList.slice(0, 10).map((quake: any) => ({
      id: quake.OriginTime || '',
      time: quake.OriginTime || '',
      magnitude: parseFloat(quake.Magnitude?.Value || '0'),
      location: quake.Hypocenter?.Area?.Name || '不明',
      depth: quake.Hypocenter?.Depth?.Value ? Number(quake.Hypocenter.Depth.Value) : null,
      intensity: quake.Intensity?.Observation?.MaxInt || '不明',
      latitude: parseFloat(quake.Hypocenter?.Location?.Latitude || '0'),
      longitude: parseFloat(quake.Hypocenter?.Location?.Longitude || '0'),
      tsunami: quake.Tsunami?.Comment?.Warning || 'なし'
    }));
  } catch (error) {
    console.error('地震情報の取得に失敗しました:', error);
    throw new Error('地震情報の取得に失敗しました');
  }
} 