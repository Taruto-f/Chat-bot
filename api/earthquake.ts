import axios from "axios";

type ScaleNumber = 10 | 20 | 30 | 40 | 45 | 50 | 55 | 60 | 70;

export interface JMAQuake {
	id: string;
	code: 551;
	time: string;
	issue: {
		source?: string;
		time: string;
		type:
			| "ScalePrompt"
			| "Destination"
			| "ScaleAndDestination"
			| "DetailScale"
			| "Foreign"
			| "Other";
		correct?:
			| "None"
			| "Unknown"
			| "ScaleOnly"
			| "DestinationOnly"
			| "ScaleAndDestination";
	};
	earthquake: {
		time: string;
		hypocenter?: {
			name?: string;
			latitude?: number;
			longitude?: number;
			depth?: number;
			magnitude?: number;
		};
		maxScale: -1 | ScaleNumber;
		domesticTsunami:
			| "None"
			| "Unknown"
			| "Checking"
			| "NonEffective"
			| "Watch"
			| "Warning";
		foreignTsunami: string;
	};
	points?: {
		pref: string;
		addr: string;
		isArea: boolean;
		scale: ScaleNumber;
	}[];
	comments: {
		freeFormComment: string;
	};
}

export interface QuakeResponse {
	time: string; // 発生時刻
	location: string; // 震源地
	intensity: string; // 最大震度
	depth: number; // 震源の深さ
	magnitude: number; // マグニチュード
}

export async function getEarthquakeInfo(): Promise<QuakeResponse> {
	try {
		const response = await axios.get<JMAQuake[]>(
			"https://api.p2pquake.net/v2/jma/quake",
			{
				responseType: "json",
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				},
			},
		);

		const earthquakes = response.data ?? [];
		if (earthquakes.length === 0) {
			throw new Error("地震情報がありません");
		}
		const data = earthquakes[0];

		const intensitys = {
			[-1]: "不明",
			10: "震度1",
			20: "震度2",
			30: "震度3",
			40: "震度4",
			45: "震度5弱",
			50: "震度5強",
			55: "震度6弱",
			60: "震度6強",
			70: "震度7",
		};

		return {
			time: data.time,
			location: data.earthquake.hypocenter?.name ?? "不明",
			intensity: intensitys[data.earthquake.maxScale],
			depth: data.earthquake.hypocenter?.depth ?? 0,
			magnitude: data.earthquake.hypocenter?.magnitude ?? 0,
		};
	} catch (error) {
		console.error("地震情報の取得に失敗しました:", error);
		throw new Error("地震情報の取得に失敗しました");
	}
}
