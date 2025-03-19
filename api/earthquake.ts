import axios from "axios";
import { XMLParser } from "fast-xml-parser";

export interface EarthquakeData {
	id: string;
	time: string;
	magnitude: string;
	location: string;
	depth: number | null;
	intensity: string;
	latitude: string;
	longitude: string;
	tsunami: string;
}

export async function getEarthquakeInfo(): Promise<EarthquakeData[]> {
	try {
		const response = await axios.get(
			"https://www.jma.go.jp/bosai/quake/data/quake.xml",
			{
				responseType: "text",
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				},
			},
		);

		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "@_",
		});

		const result = parser.parse(response.data);
		const earthquakes = result.Report?.Body?.Earthquake || [];

		// 配列でない場合は配列に変換
		const earthquakeArray = Array.isArray(earthquakes)
			? earthquakes
			: [earthquakes];

		return earthquakeArray.map((quake: any) => ({
			id: quake["@_id"] || "不明",
			time: quake.OriginTime || "不明",
			magnitude: quake.Magnitude?.Value || "不明",
			location: quake.Hypocenter?.Area?.Name || "不明",
			depth: quake.Hypocenter?.Depth?.Value
				? Number(quake.Hypocenter.Depth.Value)
				: null,
			intensity: quake.Intensity?.Observation?.MaxInt || "不明",
			latitude: quake.Hypocenter?.Location?.Latitude || "不明",
			longitude: quake.Hypocenter?.Location?.Longitude || "不明",
			tsunami: quake.Tsunami?.Comment?.Text || "なし",
		}));
	} catch (error) {
		console.error("地震情報の取得に失敗しました:", error);
		throw new Error("地震情報の取得に失敗しました");
	}
}
